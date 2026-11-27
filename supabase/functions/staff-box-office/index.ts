import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const randomHex = (bytes: number) => {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, b => b.toString(16).padStart(2, "0")).join("");
};
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
};
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const encryptQrToken = async (raw: string, encodedKey: string) => {
  const binary = atob(encodedKey);
  const keyBytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error("TICKET_QR_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(raw));
  return { qr_token_ciphertext: base64(new Uint8Array(ciphertext)), qr_token_iv: base64(iv) };
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return json({ error: "Unauthorized." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete." }, 500);

  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Unauthorized." }, 401);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await db.from("staff_profiles").select("role, active").eq("user_id", authData.user.id).maybeSingle();
  if (profileError) return json({ error: "Unable to verify staff access." }, 500);
  if (!profile?.active || !["staff", "system_admin"].includes(profile.role)) return json({ error: "An active staff account is required." }, 403);

  let body: { action?: string; purchaser_name?: string; purchaser_email?: string; idempotency_key?: string; items?: { category_id: string; attendees: { full_name: string; birth_date: string }[] }[] };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  if (body.action === "options") {
    const { data, error } = await db.from("performances")
      .select("id, starts_at, venue_name, capacity, productions!inner(title,status), ticket_categories(id,name,price,allocation,reserved_count,sold_count,active,sales_start_at,sales_end_at)")
      .eq("status", "scheduled").eq("productions.status", "published").gt("starts_at", new Date().toISOString()).order("starts_at");
    if (error) return json({ error: "Unable to load upcoming performances." }, 500);
    const performances = (data ?? []).map((p: any) => ({
      id: p.id, starts_at: p.starts_at, venue_name: p.venue_name, production_title: p.productions.title,
      categories: (p.ticket_categories ?? []).filter((c: any) => c.active && (!c.sales_start_at || c.sales_start_at <= new Date().toISOString()) && (!c.sales_end_at || c.sales_end_at > new Date().toISOString()) && c.allocation - c.reserved_count - c.sold_count > 0)
        .map((c: any) => ({ id: c.id, name: c.name, price: c.price, remaining: c.allocation - c.reserved_count - c.sold_count }))
    })).filter((p: any) => p.categories.length);
    return json({ ok: true, performances });
  }

  if (body.action !== "create") return json({ error: "Unsupported action." }, 400);
  const purchaserName = body.purchaser_name?.trim() ?? "";
  const purchaserEmail = body.purchaser_email?.trim().toLowerCase() ?? "";
  const items = body.items ?? [];
  const idempotencyKey = body.idempotency_key ?? "";
  if (!purchaserName || purchaserName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail) || purchaserEmail.length > 254)
    return json({ error: "Enter a valid purchaser name and email address." }, 400);
  if (!items.length || items.length > 20 || !idempotencyKey || idempotencyKey.length < 12) return json({ error: "Sale details are incomplete." }, 400);
  const attendees = items.flatMap(item => item.attendees ?? []);
  if (!attendees.length || attendees.length > 20 || attendees.some(a => !a.full_name?.trim() || a.full_name.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(a.birth_date)))
    return json({ error: "Every attendee needs a full name and birth date. Maximum 20 tickets per sale." }, 400);

  const encryptionKey = Deno.env.get("TICKET_QR_ENCRYPTION_KEY");
  if (!encryptionKey) return json({ error: "Ticket QR encryption is not configured. Ask System Admin to finish email setup." }, 500);
  const ticketTokens = [];
  for (let i = 0; i < attendees.length; i++) {
    const raw = randomHex(32);
    const encrypted = await encryptQrToken(raw, encryptionKey);
    ticketTokens.push({
      attendee_name: attendees[i].full_name.trim(),
      ticket_reference: `AP-${randomHex(6).toUpperCase()}`,
      qr_token_hash: await sha256(raw),
      ...encrypted,
    });
  }

  const { data, error } = await db.rpc("create_box_office_cash_sale", {
    p_staff_id: authData.user.id,
    p_purchaser_name: purchaserName,
    p_purchaser_email: purchaserEmail,
    p_items: items,
    p_idempotency_key: idempotencyKey,
    p_ticket_tokens: ticketTokens,
  });
  if (error) {
    const message = error.message.includes("Not enough tickets") || error.message.includes("unavailable") || error.message.includes("sales") || error.message.includes("no longer")
      ? error.message : "The cash sale could not be completed. No tickets were issued.";
    return json({ error: message }, 400);
  }
  return json({ ok: true, sale: data, tickets: ticketTokens.map(t => ({ ticket_reference: t.ticket_reference, attendee_name: t.attendee_name })) }, 201);
});
