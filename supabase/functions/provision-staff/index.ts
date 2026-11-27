import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return json({ error: "Unauthorized." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server authentication is not configured." }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !callerData.user) return json({ error: "Unauthorized." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerProfile, error: profileError } = await adminClient
    .from("staff_profiles")
    .select("role, active")
    .eq("user_id", callerData.user.id)
    .maybeSingle();

  if (profileError) return json({ error: "Unable to verify staff permissions." }, 500);
  if (!callerProfile || !callerProfile.active || callerProfile.role !== "system_admin") {
    return json({ error: "Only an active System Admin can create staff accounts." }, 403);
  }

  let body: { email?: unknown; display_name?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const role = body.role === "system_admin" ? "system_admin" : body.role === "staff" ? "staff" : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: "Enter a valid email address." }, 400);
  }
  if (!displayName || displayName.length > 120) {
    return json({ error: "Display name is required and must be 120 characters or fewer." }, 400);
  }
  if (!role) return json({ error: "Choose a valid staff role." }, 400);

  const configuredAppUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
  const appUrl = configuredAppUrl.endsWith("/") ? configuredAppUrl.slice(0, -1) : configuredAppUrl;
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback`,
    data: { display_name: displayName },
  });
  if (inviteError || !invited.user) {
    return json({ error: inviteError?.message ?? "Unable to send the staff invitation." }, 400);
  }

  const { error: insertError } = await adminClient.from("staff_profiles").insert({
    user_id: invited.user.id,
    display_name: displayName,
    role,
    active: true,
  });

  if (insertError) {
    await adminClient.auth.admin.deleteUser(invited.user.id);
    return json({ error: "The invitation could not be linked to a staff profile. The Auth user was rolled back." }, 500);
  }

  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_user_id: callerData.user.id,
    action: "staff_invited",
    entity_type: "staff_profile",
    entity_id: invited.user.id,
    details: { email, display_name: displayName, role },
  });

  if (auditError) {
    await adminClient.from("staff_profiles").delete().eq("user_id", invited.user.id);
    await adminClient.auth.admin.deleteUser(invited.user.id);
    return json({ error: "The invitation audit record failed. The new account was rolled back." }, 500);
  }

  return json({ ok: true, invited_user_id: invited.user.id, email, role }, 201);
});
