"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

export interface CustomerProfile {
  id: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: "es" | "en" | null;
  [key: string]: unknown;
}

export interface AppRole {
  user_id: string;
  role: "admin" | "staff" | "customer";
}

export interface UseUserResult {
  user: User | null;
  profile: CustomerProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createBrowserClient(url, anon);
}

export function useUser(): UseUserResult {
  const supabase = React.useMemo(() => getClient(), []);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadProfileAndRoles = React.useCallback(
    async (u: User | null) => {
      if (!u) {
        setProfile(null);
        setRoles([]);
        return;
      }
      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabase
          .from("customer_profiles")
          .select("*")
          .eq("id", u.id)
          .maybeSingle(),
        supabase.from("app_roles").select("*").eq("user_id", u.id),
      ]);
      setProfile((profileData as CustomerProfile) ?? null);
      setRoles((roleData as AppRole[]) ?? []);
    },
    [supabase]
  );

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user ?? null);
      await loadProfileAndRoles(data.user ?? null);
      if (active) setIsLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadProfileAndRoles(nextUser);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfileAndRoles]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  }, [supabase]);

  const isAdmin = React.useMemo(
    () => roles.some((r) => r.role === "admin" || r.role === "staff"),
    [roles]
  );

  return { user, profile, isAdmin, isLoading, signOut };
}
