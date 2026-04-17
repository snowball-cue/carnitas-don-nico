"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { markAllRead, markRead } from "@/app/actions/admin/notifications";

export function MarkAllReadButton() {
  const { t } = useTranslation();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await markAllRead();
          if (r.success) {
            toast.success(t("admin.notifications.allRead"));
            window.location.reload();
          } else toast.error(r.error ?? t("common.error"));
        })
      }
    >
      <CheckCheck className="h-4 w-4" />
      {t("admin.notifications.markAllRead")}
    </Button>
  );
}

export function MarkReadInline({ id }: { id: string }) {
  const { t } = useTranslation();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={t("admin.notifications.markRead")}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await markRead(id);
          if (r.success) {
            window.location.reload();
          } else toast.error(r.error ?? t("common.error"));
        })
      }
    >
      <Check className="h-4 w-4" />
    </Button>
  );
}
