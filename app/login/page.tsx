"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Logo } from "@/components/brand/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/stores/cart";
import { AuthShell, AuthForm } from "@/components/auth/AuthForm";
import PasskeySignInButton from "@/components/auth/PasskeySignInButton";
import WebAuthnSupportedGuard from "@/components/auth/WebAuthnSupportedGuard";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") ?? "/";
  const error = search.get("error");
  const cartHasItems = useCartStore((s) => s.lines.length > 0);

  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (error) {
      toast.error(t("auth.signInFailed") ?? "Could not sign in.", {
        description: error,
      });
    }
  }, [error, t]);

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      toast.error(t("auth.signInFailed") ?? "Could not sign in.", {
        description: error.message,
      });
      return;
    }
    toast.success(t("auth.signedIn") ?? "Signed in.");
    router.replace(redirect);
    router.refresh();
  };

  const guestCta = cartHasItems ? "/checkout/guest" : "/menu";

  return (
    <AuthShell
      title={
        <span className="flex flex-col items-center gap-4">
          <Logo size="lg" priority />
          <span>{t("auth.welcomeBack") ?? "Welcome back"}</span>
        </span>
      }
      subtitle={
        t("auth.welcomeBackSubtitle") ??
        "Sign in to track your orders and reserve your pound."
      }
      footer={
        <div className="space-y-2">
          <div>
            {t("auth.noAccount") ?? "No account yet?"}{" "}
            <Link
              href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
              className="font-medium text-nopal underline-offset-4 hover:underline"
            >
              {t("auth.createAccount") ?? "Create one"}
            </Link>
          </div>
          <div>
            <Link
              href={guestCta}
              className="text-mole/70 underline-offset-4 hover:text-nopal hover:underline"
            >
              {t("auth.continueAsGuest") ?? "Continue as guest"}
            </Link>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <WebAuthnSupportedGuard>
          <PasskeySignInButton
            redirectTo={redirect}
            variant="default"
            size="xl"
            className="w-full"
          />
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-papel/70" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider text-mole/50">
              <span className="bg-papel-warm px-2">
                {t("common.or") ?? "o"}
              </span>
            </div>
          </div>
        </WebAuthnSupportedGuard>

        <Form {...form}>
          <AuthForm onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.emailLabel") ?? "Email"}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="tu@ejemplo.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.passwordLabel") ?? "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-mole/70 underline-offset-4 hover:text-nopal hover:underline"
              >
                {t("auth.forgotPassword") ?? "Forgot password?"}
              </Link>
            </div>
            <Button type="submit" size="lg" variant="oro" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {t("auth.signIn") ?? "Sign In"}
            </Button>
          </AuthForm>
        </Form>
      </div>
    </AuthShell>
  );
}
