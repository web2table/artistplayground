import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const authorization = req.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\\s+/i, "");
  if (!token || token === authorization) return json({ error: "Unauthorized." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete." }, 500);

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Unauthorized." }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from("staff_profiles").select("role, active").eq("user_id", authData.user.id).maybeSingle();
  if (actorError) return json({ error: "Unable to verify permissions." }, 500);
  if (!actor?.active || actor.role !== "system_admin") return json({ error: "Only an active System Admin can manage staff." }, 403);

  let body: { action?: string; user_id?: string; role?: string; active?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  if (body.action === "list") {
    const [{ data: profiles, error: profilesError }, { data: authUsers, error: usersError }] = await Promise.all([
      admin.from("staff_profiles").select("user_id, display_name, role, active, created_at, updated_at").order("created_at", { ascending: false }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (profilesError || usersError) return json({ error: "Unable to load staff accounts." }, 500);
    const users = new Map((authUsers.users ?? []).map((u) => [u.id, u]));
    return json({ ok: true, staff: (profiles ?? []).map((p) => {
      const u = users.get(p.user_id);
      return { ...p, email: u?.email ?? "", email_confirmed: Boolean(u?.email_confirmed_at), invited_at: u?.invited_at ?? null, last_sign_in_at: u?.last_sign_in_at ?? null };
    }) });
  }

  if (body.action === "update") {
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    if (!userId) return json({ error: "Staff account is required." }, 400);
    if (userId === authData.user.id && body.active === false) return json({ error: "You cannot deactivate your own System Admin account." }, 400);
    if (body.role !== undefined && !["staff", "system_admin"].includes(body.role)) return json({ error: "Invalid staff role." }, 400);
    if (body.active !== undefined && typeof body.active !== "boolean") return json({ error: "Invalid account status." }, 400);

    const { data: target, error: targetError } = await admin.from("staff_profiles").select("user_id, role, active").eq("user_id", userId).maybeSingle();
    if (targetError || !target) return json({ error: "Staff account not found." }, 404);

    if (target.role === "system_admin" && target.active && (body.active === false || body.role === "staff")) {
      const { count, error: countError } = await admin.from("staff_profiles").select("user_id", { count: "exact", head: true }).eq("role", "system_admin").eq("active", true);
      if (countError) return json({ error: "Unable to verify active administrator count." }, 500);
      if ((count ?? 0) <= 1) return json({ error: "At least one active System Admin must remain." }, 400);
    }

    const patch: Record<string, unknown> = {};
    if (body.role !== undefined) patch.role = body.role;
    if (body.active !== undefined) patch.active = body.active;
    if (!Object.keys(patch).length) return json({ error: "No staff changes supplied." }, 400);
    const { error: updateError } = await admin.from("staff_profiles").update(patch).eq("user_id", userId);
    if (updateError) return json({ error: "Unable to update staff account." }, 500);

    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_user_id: authData.user.id,
      action: "staff_account_updated",
      entity_type: "staff_profile",
      entity_id: userId,
      details: patch,
    });
    if (auditError) return json({ error: "Account updated, but the audit log could not be recorded. Contact an administrator." }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unsupported action." }, 400);
});
