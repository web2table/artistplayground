import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\\s+/i, "");
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

  let body: { booking_reference?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const reference = typeof body.booking_reference === "string" ? body.booking_reference.trim().toUpperCase() : "";
  if (!reference || reference.length > 40 || !/^[A-Z0-9-]+$/.test(reference)) {
    return json({ error: "Enter a valid booking reference." }, 400);
  }

  const { data: booking, error: bookingError } = await db.from("bookings")
    .select("id, booking_reference, purchaser_name, purchaser_email, status, currency, subtotal, total_amount, created_at, confirmed_at")
    .eq("booking_reference", reference).maybeSingle();
  if (bookingError) return json({ error: "Unable to search bookings." }, 500);
  if (!booking) return json({ ok: true, found: false });

  const [
    { data: attendees, error: attendeesError },
    { data: tickets, error: ticketsError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    db.from("attendees").select("id, full_name").eq("booking_id", booking.id).order("created_at"),
    db.from("tickets").select("id, attendee_id, ticket_reference, status, performance_id, ticket_category_id").eq("booking_id", booking.id).order("created_at"),
    db.from("payments").select("id, method, status, amount, currency, provider_reference, created_at").eq("booking_id", booking.id).order("created_at", { ascending: false }),
  ]);
  if (attendeesError || ticketsError || paymentsError) return json({ error: "Unable to load booking details." }, 500);

  const performanceIds = [...new Set((tickets ?? []).map(t => t.performance_id))];
  const categoryIds = [...new Set((tickets ?? []).map(t => t.ticket_category_id))];
  const [{ data: performances, error: performanceError }, { data: categories, error: categoryError }] = await Promise.all([
    performanceIds.length ? db.from("performances").select("id, starts_at, venue_name, status").in("id", performanceIds) : Promise.resolve({ data: [], error: null }),
    categoryIds.length ? db.from("ticket_categories").select("id, name").in("id", categoryIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (performanceError || categoryError) return json({ error: "Unable to load ticket details." }, 500);

  const performanceMap = new Map((performances ?? []).map(p => [p.id, p]));
  const categoryMap = new Map((categories ?? []).map(c => [c.id, c]));
  const attendeeMap = new Map((attendees ?? []).map(a => [a.id, a]));
  const ticketDetails = (tickets ?? []).map(t => ({
    ticket_reference: t.ticket_reference,
    status: t.status,
    attendee_name: attendeeMap.get(t.attendee_id)?.full_name ?? "Attendee",
    category: categoryMap.get(t.ticket_category_id)?.name ?? "Ticket",
    performance: performanceMap.get(t.performance_id) ?? null,
  }));

  await db.from("audit_logs").insert({
    actor_user_id: authData.user.id,
    action: "staff_booking_lookup",
    entity_type: "booking",
    entity_id: booking.id,
    details: { booking_reference: reference },
  });

  return json({ ok: true, found: true, booking, attendees: (attendees ?? []).map(a => ({ full_name: a.full_name })), tickets: ticketDetails, payments: payments ?? [] });
});
