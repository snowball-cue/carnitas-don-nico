-- =============================================================================
-- Simpler signup-trigger fix
--
-- 0004 failed on ALTER FUNCTION ... OWNER TO supabase_auth_admin because the
-- SQL Editor's postgres role isn't a member of that role. Skip the ownership
-- transfer. Instead, make the trigger body bullet-proof:
--   - Wrap every INSERT in its own EXCEPTION block
--   - Never re-raise: a profile/role failure must NOT take down auth.users
--   - The app will lazily create the profile on first sign-in if needed
--
-- With RLS policies already in place (0003), this should unblock signup.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  ref_code text;
BEGIN
  -- Generate referral code (fallback to hash-based if function fails)
  BEGIN
    ref_code := public.generate_referral_code();
  EXCEPTION WHEN OTHERS THEN
    ref_code := 'NICO-' || upper(substr(md5(NEW.id::text), 1, 6));
  END;

  -- Insert profile (swallow any error)
  BEGIN
    INSERT INTO public.customer_profiles (id, full_name, email, phone, referral_code)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(COALESCE(NEW.email, ''), '@', 1)
      ),
      NEW.email,
      NEW.phone,
      ref_code
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed: % %', SQLSTATE, SQLERRM;
  END;

  -- Insert customer role (swallow any error)
  BEGIN
    INSERT INTO public.app_roles (user_id, role)
    VALUES (NEW.id, 'customer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user role insert failed: % %', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Broaden grants so any role that may execute this function can read/write
GRANT EXECUTE ON FUNCTION public.handle_new_user()        TO postgres, service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO postgres, service_role, authenticated, anon;
GRANT INSERT, SELECT, UPDATE ON public.customer_profiles  TO service_role, authenticated;
GRANT INSERT, SELECT         ON public.app_roles          TO service_role, authenticated;

-- Grant to supabase_auth_admin if it exists (conditional, no ownership change)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.handle_new_user()        TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO supabase_auth_admin;
    GRANT INSERT, SELECT, UPDATE ON public.customer_profiles  TO supabase_auth_admin;
    GRANT INSERT, SELECT         ON public.app_roles          TO supabase_auth_admin;
  END IF;
END $$;

-- =============================================================================
-- End of 0005_signup_trigger_v3.sql
-- =============================================================================
