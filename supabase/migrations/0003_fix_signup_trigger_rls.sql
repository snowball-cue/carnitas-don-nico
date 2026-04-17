-- =============================================================================
-- Fix: signup fails with "Database error saving new user"
--
-- Cause: handle_new_user() runs as SECURITY DEFINER but its owner does not
-- bypass RLS. customer_profiles and app_roles have RLS enabled and no INSERT
-- policies, so the trigger's INSERT is rejected → Supabase Auth rolls back
-- the whole auth.users insert.
--
-- Fix: allow the auth-context INSERT from the trigger.
-- =============================================================================

-- Allow service role + trigger context to insert profile / role rows
DROP POLICY IF EXISTS "profile_self_insert"   ON public.customer_profiles;
DROP POLICY IF EXISTS "roles_self_insert"     ON public.app_roles;

CREATE POLICY "profile_self_insert" ON public.customer_profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "roles_self_insert" ON public.app_roles
  FOR INSERT
  WITH CHECK (role = 'customer');  -- only customer role can be self-assigned

-- Belt & suspenders: explicit grants for supabase_auth_admin (the role that
-- executes auth triggers in Supabase hosted Postgres)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT INSERT, SELECT ON public.customer_profiles TO supabase_auth_admin;
    GRANT INSERT, SELECT ON public.app_roles         TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.handle_new_user()        TO supabase_auth_admin;
  END IF;
END $$;

-- =============================================================================
-- End of 0003_fix_signup_trigger_rls.sql
-- =============================================================================
