import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.4";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function decryptQrToken(ciphertext: string, iv: string, encodedKey: string) {
  const keyBytes = decodeBase64(encodedKey);
  if (keyBytes.length !== 32) throw new Error("Ticket QR encryption key must decode to 32 bytes.");
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64(iv) }, key, decodeBase64(ciphertext));
  return new TextDecoder().decode(plain);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return json({ error: "Unauthorized." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const encryptionKey = Deno.env.get("TICKET_QR_ENCRYPTION_KEY");
  const mode = Deno.env.get("TICKET_EMAIL_MODE") ?? "test";
  const testRecipient = Deno.env.get("RESEND_TEST_RECIPIENT")?.trim().toLowerCase();
  const from = mode === "production" ? Deno.env.get("TICKET_EMAIL_FROM") : "Artist Playground Tickets <onboarding@resend.dev>";

  if (!url || !anonKey || !serviceKey || !resendKey || !encryptionKey) return json({ error: "Email or ticket security configuration is incomplete." }, 500);
  if (mode !== "test" && mode !== "production") return json({ error: "Invalid ticket email mode." }, 500);
  if (mode === "test" && !testRecipient) return json({ error: "Set RESEND_TEST_RECIPIENT to the email address verified in your Resend account." }, 500);
  if (mode === "production" && (!from || !from.includes("@") || from.includes("onboarding@resend.dev"))) return json({ error: "Configure TICKET_EMAIL_FROM with your verified production sender." }, 500);

  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Unauthorized." }, 401);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await db.from("staff_profiles")
    .select("role,active").eq("user_id", authData.user.id).maybeSingle();
  if (profileError) return json({ error: "Unable to verify staff access." }, 500);
  if (!profile?.active || !["staff", "system_admin"].includes(profile.role)) return json({ error: "An active staff account is required." }, 403);

  let body: { booking_reference?: string; request_key?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const reference = typeof body.booking_reference === "string" ? body.booking_reference.trim().toUpperCase() : "";
  const requestKey = typeof body.request_key === "string" ? body.request_key.trim() : "";
  if (!/^[A-Z0-9-]{4,40}$/.test(reference) || !/^[A-Za-z0-9-]{12,100}$/.test(requestKey)) return json({ error: "A valid booking reference and request key are required." }, 400);

  const { data: booking, error: bookingError } = await db.from("bookings")
    .select("id,booking_reference,purchaser_name,purchaser_email,status,currency,total_amount")
    .eq("booking_reference", reference).maybeSingle();
  if (bookingError) return json({ error: "Unable to load booking." }, 500);
  if (!booking) return json({ error: "Booking not found." }, 404);

  const recipient = mode === "test" ? testRecipient! : booking.purchaser_email.toLowerCase();
  const { data: delivery, error: deliveryError } = await db.rpc("begin_ticket_email_delivery", {
    p_booking_reference: reference,
    p_recipient_email: recipient,
    p_request_key: requestKey,
    p_actor: authData.user.id,
  });
  if (deliveryError || !delivery?.delivery_id) return json({ error: deliveryError?.message ?? "Unable to start email delivery." }, 400);
  if (delivery.status === "sent") return json({ ok: true, already_sent: true, recipient, booking_reference: reference, delivery_id: delivery.delivery_id });

  const { data: tickets, error: ticketsError } = await db.from("tickets")
    .select("id,ticket_reference,status,qr_token_ciphertext,qr_token_iv,attendees!inner(full_name),performances!inner(starts_at,venue_name),ticket_categories!inner(name)")
    .eq("booking_id", booking.id).in("status", ["issued", "redeemed"]).order("created_at");
  if (ticketsError || !tickets?.length) {
    await db.from("email_deliveries").update({ status: "failed", error_message: "Unable to load ticket records." }).eq("id", delivery.delivery_id);
    return json({ error: "Unable to load ticket records." }, 500);
  }

  try {
    const attachments: { filename: string; content: string; content_type: string }[] = [];
    const rows: string[] = [];
    for (const ticket of tickets as any[]) {
      const qrToken = await decryptQrToken(ticket.qr_token_ciphertext, ticket.qr_token_iv, encryptionKey);
      const dataUrl = await QRCode.toDataURL(qrToken, { errorCorrectionLevel: "M", margin: 2, width: 420 });
      const content = dataUrl.split(",")[1];
      attachments.push({ filename: `ticket-${ticket.ticket_reference}.png`, content, content_type: "image/png" });
      rows.push(`<tr><td style="padding:14px 0;border-bottom:1px solid #e5e7eb"><strong>${escapeHtml(ticket.attendees.full_name)}</strong><br><span style="color:#667085;font-size:13px">${escapeHtml(ticket.ticket_categories.name)} · ${escapeHtml(ticket.ticket_reference)}</span><br><span style="color:#667085;font-size:12px">${escapeHtml(new Date(ticket.performances.starts_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }))} · ${escapeHtml(ticket.performances.venue_name)}</span><br><span style="font-size:12px;font-weight:700;color:${ticket.status === "redeemed" ? "#a15c00" : "#18794e"}">${ticket.status === "redeemed" ? "Already admitted" : "Valid ticket"}</span></td></tr>`);
    }

    const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#17191c"><div style="max-width:620px;margin:28px auto;padding:28px;background:#fff;border:1px solid #e5e7eb;border-radius:14px"><div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#008db5">ARTIST PLAYGROUND</div><h1 style="font-size:25px;margin:12px 0 6px">Your tickets are ready</h1><p style="color:#667085;font-size:14px;line-height:1.6">Hello ${escapeHtml(booking.purchaser_name)}, your booking is confirmed. Each ticket's QR code is attached as a separate PNG image. Please keep each QR code private and present it at admission.</p><div style="background:#f8fafc;padding:14px;border-radius:8px;margin:18px 0"><div style="font-size:11px;color:#667085;letter-spacing:1px">BOOKING REFERENCE</div><strong style="font-size:20px;letter-spacing:1px">${escapeHtml(booking.booking_reference)}</strong></div><h2 style="font-size:16px">Attendee tickets (${tickets.length})</h2><table style="width:100%;border-collapse:collapse">${rows.join("")}</table><p style="font-size:12px;color:#667085;line-height:1.6;margin-top:22px">Please arrive before the performance begins. Each ticket can be admitted once only. If you need help, contact Artist Playground and provide your booking reference.</p><p style="font-size:12px;color:#98a2b3;margin-top:24px">Artist Playground · A space for talent at every stage.</p></div></body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `artist-playground-ticket-${delivery.delivery_id}`,
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `Your Artist Playground tickets · ${booking.booking_reference}`,
        html,
        attachments,
      }),
    });
    const responseText = await response.text();
    let result: any = {};
    try { result = JSON.parse(responseText); } catch { /* provider response may be non-JSON */ }
    if (!response.ok) {
      const message = typeof result.message === "string" ? result.message.slice(0, 500) : `Resend returned HTTP ${response.status}`;
      await db.from("email_deliveries").update({ status: "failed", error_message: message }).eq("id", delivery.delivery_id);
      await db.from("audit_logs").insert({ actor_user_id: authData.user.id, action: "ticket_email_failed", entity_type: "booking", entity_id: booking.id, details: { booking_reference: reference, delivery_id: delivery.delivery_id, provider_status: response.status } });
      return json({ error: "Resend could not send the ticket email.", details: message }, 502);
    }

    const { error: updateError } = await db.from("email_deliveries").update({
      status: "sent", provider_message_id: result.id ?? null, sent_at: new Date().toISOString(), error_message: null,
    }).eq("id", delivery.delivery_id);
    await db.from("audit_logs").insert({ actor_user_id: authData.user.id, action: "ticket_email_sent", entity_type: "booking", entity_id: booking.id, details: { booking_reference: reference, delivery_id: delivery.delivery_id, recipient, provider_message_id: result.id ?? null, mode } });
    if (updateError) return json({ ok: true, warning: "Email accepted by Resend, but delivery logging needs reconciliation.", delivery_id: delivery.delivery_id, provider_message_id: result.id ?? null }, 202);
    return json({ ok: true, recipient, booking_reference: reference, ticket_count: tickets.length, delivery_id: delivery.delivery_id, provider_message_id: result.id ?? null, mode });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Ticket email generation failed.";
    await db.from("email_deliveries").update({ status: "failed", error_message: message }).eq("id", delivery.delivery_id);
    return json({ error: "Unable to generate or send ticket email.", details: message }, 500);
  }
});
