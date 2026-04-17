"use client";

import * as React from "react";
import { toast } from "sonner";
import { KeyRound, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import PasskeyEnrollButton from "./PasskeyEnrollButton";

interface PasskeyRow {
  id: string;
  nickname: string | null;
  device_type: string | null;
  backed_up: boolean;
  transports: string[];
  created_at: string;
  last_used_at: string | null;
}

export function PasskeyList() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = React.useState<PasskeyRow[] | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/passkey/list");
    if (!res.ok) {
      setRows([]);
      return;
    }
    const { passkeys } = await res.json();
    setRows(passkeys as PasskeyRow[]);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/passkey/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "error" }));
        throw new Error(error || "delete_failed");
      }
      toast.success(t("auth.passkeyRemoved") ?? "Passkey removed.");
      await load();
    } catch (err) {
      toast.error(t("auth.passkeyRemoveFailed") ?? "Could not remove passkey.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  }

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(i18n.language, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  if (rows === null) {
    return (
      <div className="flex items-center gap-2 text-mole/60">
        <Loader2 className="size-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-mole">
          {t("auth.yourPasskeys") ?? "Your passkeys"}
        </h3>
        <PasskeyEnrollButton onEnrolled={load} size="sm" variant="outline" />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-mole/60">
          {t("auth.noPasskeysYet") ?? "You have no passkeys yet."}
        </p>
      ) : (
        <ul className="divide-y divide-papel-warm rounded-md border border-papel-warm bg-papel">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <KeyRound className="size-5 shrink-0 text-nopal" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-mole">
                  {p.nickname ??
                    (t("auth.unnamedPasskey") as string) ??
                    "Unnamed passkey"}
                </p>
                <p className="truncate text-xs text-mole/60">
                  {t("auth.passkeyCreated", { date: fmt(p.created_at) ?? "-" }) ??
                    `Created ${fmt(p.created_at)}`}
                  {p.last_used_at
                    ? ` · ${
                        t("auth.passkeyLastUsed", { date: fmt(p.last_used_at) }) ??
                        `last used ${fmt(p.last_used_at)}`
                      }`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(p.id)}
                disabled={deletingId === p.id}
                aria-label={t("auth.removePasskey") ?? "Remove passkey"}
              >
                {deletingId === p.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 className="text-chile" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PasskeyList;
