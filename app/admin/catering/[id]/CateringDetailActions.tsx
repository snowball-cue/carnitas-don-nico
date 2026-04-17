"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { updateCateringRequest } from "@/app/actions/catering";
import type { CateringStatus } from "@/types/database";

const STATUSES: CateringStatus[] = [
  "new",
  "contacted",
  "quoted",
  "confirmed",
  "completed",
  "cancelled",
];

interface Props {
  id: string;
  initialStatus: CateringStatus;
  initialQuotedPrice: number | null;
  initialNotes: string;
}

export function CateringDetailActions({
  id,
  initialStatus,
  initialQuotedPrice,
  initialNotes,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState<CateringStatus>(initialStatus);
  const [quotedPrice, setQuotedPrice] = React.useState<string>(
    initialQuotedPrice !== null ? initialQuotedPrice.toFixed(2) : "",
  );
  const [notes, setNotes] = React.useState(initialNotes);

  const saveStatus = (next: CateringStatus) =>
    startTransition(async () => {
      const res = await updateCateringRequest({ id, status: next });
      if (res.success) {
        setStatus(next);
        toast.success(
          t("admin.catering.statusUpdated", "Status updated"),
        );
        router.refresh();
      } else {
        toast.error(res.error ?? t("common.error"));
      }
    });

  const saveQuote = () =>
    startTransition(async () => {
      const n = quotedPrice.trim() === "" ? null : Number(quotedPrice);
      if (n !== null && !Number.isFinite(n)) {
        toast.error(t("admin.catering.invalidAmount", "Invalid amount"));
        return;
      }
      const res = await updateCateringRequest({ id, quotedPrice: n });
      if (res.success) {
        toast.success(t("admin.catering.quoteSaved", "Quote saved"));
        router.refresh();
      } else {
        toast.error(res.error ?? t("common.error"));
      }
    });

  const saveNotes = () =>
    startTransition(async () => {
      const res = await updateCateringRequest({ id, notes });
      if (res.success) {
        toast.success(t("admin.catering.notesSaved", "Notes saved"));
        router.refresh();
      } else {
        toast.error(res.error ?? t("common.error"));
      }
    });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.catering.statusLabel", "Status")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={status}
            onValueChange={(v) => saveStatus(v as CateringStatus)}
          >
            <SelectTrigger disabled={pending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`admin.catering.status.${s}`, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.catering.quotedPrice", "Quoted price")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            value={quotedPrice}
            onChange={(e) => setQuotedPrice(e.target.value)}
            disabled={pending}
          />
          <Button
            onClick={saveQuote}
            disabled={pending}
            className="w-full"
          >
            {t("common.save", "Save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.catering.notes", "Notes")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              "admin.catering.notesPlaceholder",
              "Internal notes, special requests, call logs...",
            )}
            disabled={pending}
          />
          <div className="flex justify-end">
            <Button onClick={saveNotes} disabled={pending}>
              {t("common.save", "Save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
