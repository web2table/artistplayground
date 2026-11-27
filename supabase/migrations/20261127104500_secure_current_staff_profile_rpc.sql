-- Return only the caller's own staff profile to an authenticated session.
-- Staff table access remains revoked; this narrow function is the authorization lookup.
CREATE OR REPLACE FUNCTION public.get_my_staff_profile()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  role public.staff_role,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT sp.user_id, sp.display_name, sp.role, sp.active
  FROM public.staff_profiles AS sp
  WHERE sp.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_staff_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_staff_profile() TO authenticated;
