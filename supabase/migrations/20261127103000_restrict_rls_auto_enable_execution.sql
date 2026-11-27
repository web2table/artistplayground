-- Restrict direct RPC execution of the internal event-trigger function.
-- The ensure_rls event trigger continues to invoke it automatically on DDL.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
