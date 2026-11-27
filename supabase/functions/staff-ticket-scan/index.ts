import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

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
  const { data: profile, error: profileError } = await db.from("staff_profiles")
    .select("role, active").eq("user_id", authData.user.id).maybeSingle();
  if (profileError) return json({ error: "Unable to verify staff access." }, 500);
  if (!profile?.active || !["staff", "system_admin"].includes(profile.role)) {
    return json({ error: "An active staff account is required." }, 403);
  }

  let body: { action?: string; credential?: string; performance_id?: string; device_label?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  if (body.action === "performances") {
    const { data: performances, error: performanceError } = await db.from("performances")
      .select("id, starts_at, venue_name, productions!inner(title, status)")
      .eq("status", "scheduled")
      .eq("productions.status", "published")
      .order("starts_at", { ascending: true });
    if (performanceError) return json({ error: "Unable to load performances." }, 500);
    return json({ ok: true, performances: (performances ?? []).map((p: any) => ({
      id: p.id, starts_at: p.starts_at, venue_name: p.venue_name, production_title: p.productions?.title ?? "Production"
    })) });
  }
  const credential = typeof body.credential === "string" ? body.credential.trim() : "";
  const performanceId = typeof body.performance_id === "string" ? body.performance_id : "";
  if (!credential || credential.length > 512) return json({ error: "Enter a ticket reference or scan its QR code." }, 400);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(performanceId)) {
    return json({ error: "Select a valid performance before scanning." }, 400);
  }

  const isReference = /^[A-Za-z0-9-]{4,40}$/.test(credential);
  const lookupCredential = isReference ? credential.toUpperCase() : await sha256(credential);
  const { data, error } = await db.rpc("redeem_ticket_for_staff", {
    p_staff_user_id: authData.user.id,
    p_credential: lookupCredential,
    p_performance_id: performanceId,
    p_device_label: typeof body.device_label === "string" ? body.device_label.slice(0, 100) : null,
  });
  if (error) return json({ error: "Ticket validation failed. Please try again." }, 500);
  return json(data as Record<string, unknown>);
});
