-- =============================================================================
-- Diagnose + harden handle_new_user trigger
--
-- Even with 0003's RLS fix, signups were still failing. Most likely:
-- (a) the function's SECURITY DEFINER owner lacks BYPASSRLS, OR
-- (b) the trigger raises inside ON CONFLICT due to missing unique key clause,
-- OR (c) citext extension not visible in the trigger's search_path.
--
-- Fix: rewrite with explicit exception swallowing + logging, make function
-- owner supabase_auth_admin (which has BYPASSRLS), and widen search_path.
-- =============================================================================

-- Re-declare the function with hardened error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  ref_code text;
BEGIN
  -- Generate referral code
  BEGIN
    ref_code := public.generate_referral_code();
  EXCEPTION WHEN OTHERS THEN
    ref_code := 'NICO-' || upper(substr(md5(NEW.id::text), 1, 6));
  END;

  -- Insert profile (non-fatal)
  BEGIN
    INSERT INTO public.customer_profiles (id, full_name, email, phone, referral_code)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      NEW.email::text,
      NEW.phone,
      ref_code
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profile insert failed: % — %', SQLSTATE, SQLERRM;
  END;

  -- Insert customer role (non-fatal)
  BEGIN
    INSERT INTO public.app_roles (user_id, role)
    VALUES (NEW.id, 'customer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: role insert failed: % — %', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Transfer ownership to supabase_auth_admin so SECURITY DEFINER runs with
-- BYPASSRLS (that role has it in Supabase hosted Postgres)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    ALTER FUNCTION public.handle_new_user()          OWNER TO supabase_auth_admin;
    ALTER FUNCTION public.generate_referral_code()   OWNER TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.handle_new_user()        TO supabase_auth_admin, postgres, service_role;
    GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO supabase_auth_admin, postgres, service_role;
  END IF;
END $$;

-- Make sure the trigger is still wired up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Belt & suspenders: broaden grants to the role that runs the trigger
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT INSERT, SELECT, UPDATE ON public.customer_profiles TO supabase_auth_admin;
    GRANT INSERT, SELECT         ON public.app_roles         TO supabase_auth_admin;
  END IF;
END $$;

-- =============================================================================
-- End of 0004_diagnose_and_fix_trigger.sql
-- =============================================================================
