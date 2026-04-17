"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
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
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthShell, AuthForm } from "@/components/auth/AuthForm";

const schema = z.object({
  email: z.string().email(),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const onSubmit = async ({ email }: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(t("auth.forgotFailed") ?? "Could not send reset email.", {
        description: error.message,
      });
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell
        title={
          <span className="flex flex-col items-center gap-3">
            <MailCheck className="size-10 text-nopal" />
            {t("auth.resetSentTitle") ?? "Revisa tu correo"}
          </span>
        }
        subtitle={
          t("auth.resetSentBody") ??
          "We sent a link to reset your password."
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
        <div />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.forgotTitle") ?? "Reset your password"}
      subtitle={
        t("auth.forgotSubtitle") ??
        "Enter your email and we'll send you a link."
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
      <Form {...form}>
        <AuthForm onSubmit={form.handleSubmit(onSubmit)}>
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
          <Button type="submit" size="lg" variant="oro" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            {t("auth.sendResetLink") ?? "Send reset link"}
          </Button>
        </AuthForm>
      </Form>
    </AuthShell>
  );
}
