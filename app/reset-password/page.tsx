"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AuthShell, AuthForm } from "@/components/auth/AuthForm";

const schema = z
  .object({
    password: z.string().min(8),
    confirm_password: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ["confirm_password"],
    message: "passwords_do_not_match",
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const supabase = React.useMemo(() => createBrowserSupabaseClient(), []);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm_password: "" },
  });
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async ({ password }: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(t("auth.resetFailed") ?? "Could not update password.", {
        description: error.message,
      });
      return;
    }
    toast.success(t("auth.resetSuccess") ?? "Password updated.");
    router.replace("/account");
    router.refresh();
  };

  return (
    <AuthShell
      title={t("auth.resetTitle") ?? "Set a new password"}
      subtitle={
        t("auth.resetSubtitle") ?? "Choose a strong password for your account."
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("auth.newPasswordLabel") ?? "New password"}
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
          <Button type="submit" size="lg" variant="oro" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            {t("auth.savePassword") ?? "Save password"}
          </Button>
        </AuthForm>
      </Form>
    </AuthShell>
  );
}
