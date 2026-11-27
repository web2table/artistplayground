DROP FUNCTION IF EXISTS public.get_my_staff_profile();

GRANT SELECT ON TABLE public.staff_profiles TO authenticated;

CREATE POLICY "staff can read their own profile"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));
