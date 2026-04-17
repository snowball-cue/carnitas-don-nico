"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Logo } from "@/components/brand/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthShell, AuthForm } from "@/components/auth/AuthForm";

const phoneRegex = /^[+0-9().\-\s]{7,}$/;

const schema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().regex(phoneRegex, { message: "invalid_phone" }),
    password: z.string().min(8),
    confirm_password: z.string().min(8),
    marketing_opt_in: z.boolean().default(false),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ["confirm_password"],
    message: "passwords_do_not_match",
  });

type FormData = z.infer<typeof schema>;

export default function SignUpPage() {
  const { t } = useTranslation();
  const search = useSearchParams();
  const redirect = search.get("redirect") ?? "/welcome";

  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
      marketing_opt_in: false,
    },
  });

  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      phone: values.phone,
      options: {
        data: {
          full_name: values.full_name,
          phone: values.phone,
          marketing_opt_in: values.marketing_opt_in,
        },
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/confirm?next=${encodeURIComponent(redirect)}`
            : undefined,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(t("auth.signUpFailed") ?? "Could not sign up.", {
        description: error.message,
      });
      return;
    }
    setSent(values.email);
  };

  if (sent) {
    return (
      <AuthShell
        title={
          <span className="flex flex-col items-center gap-3">
            <MailCheck className="size-10 text-nopal" />
            {t("auth.checkYourEmailTitle") ?? "Revisa tu correo"}
          </span>
        }
        subtitle={
          t("auth.checkYourEmailBody", { email: sent }) ??
          `We sent a confirmation to ${sent}.`
        }
        footer={
          <Link
            href="/login"
            className="font-medium text-nopal underline-offset-4 hover:underline"
          >
            {t("auth.backToSignIn") ?? "Back to sign in"}
          </Link>
        }
      >
        <p className="text-center text-sm text-mole/70">
          {t("auth.checkYourEmailHint") ??
            "Click the link in your email to confirm your account."}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={
        <span className="flex flex-col items-center gap-4">
          <Logo size="lg" priority />
          <span>{t("auth.createAccountTitle") ?? "Crea tu cuenta"}</span>
        </span>
      }
      subtitle={
        t("auth.createAccountSubtitle") ??
        "Earn points with every order — and cook time goes faster for us."
      }
      footer={
        <>
          {t("auth.haveAccount") ?? "Already have an account?"}{" "}
          <Link
            href="/login"
            className="font-medium text-nopal underline-offset-4 hover:underline"
          >
            {t("auth.signIn") ?? "Sign in"}
          </Link>
        </>
      }
    >
      <Form {...form}>
        <AuthForm onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.fullNameLabel") ?? "Full name"}</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.emailLabel") ?? "Email"}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth.phoneLabel") ?? "Phone"}</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" placeholder="(512) 555-0123" {...field} />
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
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>
                  {t("auth.passwordHint") ?? "Minimum 8 characters."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("auth.confirmPasswordLabel") ?? "Confirm password"}
                </FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="marketing_opt_in"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border border-papel/70 bg-papel px-4 py-3">
                <div className="space-y-0.5 pr-4">
                  <FormLabel>
                    {t("auth.marketingOptInLabel") ??
                      "Send me updates about upcoming pickups"}
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" variant="oro" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            {t("auth.createAccount") ?? "Create account"}
          </Button>
        </AuthForm>
      </Form>
    </AuthShell>
  );
}
