"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { UploadCloud, Camera, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  uploadReceipt,
  parseReceipt,
  approveReceipt,
  rejectReceipt,
  convertReceiptToExpense,
} from "@/app/actions/admin/receipts";
import type { ExpenseCategory, ReceiptRow } from "@/types/database";

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

const CATEGORIES: ExpenseCategory[] = [
  "carne",
  "heb",
  "sams",
  "restaurant_depot",
  "cilantro_lime",
  "tortilla",
  "gas",
  "packaging",
  "misc",
  "other",
];

export default function AdminReceiptsPage() {
  const { t } = useTranslation();
  const supabase = React.useMemo(() => getClient(), []);
  const [rows, setRows] = React.useState<ReceiptRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("receipts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as ReceiptRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onUpload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await uploadReceipt(form);
    if (res.success && res.data) {
      toast.success(t("admin.receipts.uploaded"));
      // Kick off stub parse
      await parseReceipt(res.data.id);
      void load();
    } else {
      toast.error(res.error ?? t("common.error"));
    }
    setUploading(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void onUpload(f);
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-mole">
        {t("admin.receipts.title")}
      </h1>

      <div
        className="rounded-lg border-2 border-dashed border-nopal/30 bg-papel-warm p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <UploadCloud className="mx-auto h-8 w-8 text-nopal/60 mb-2" />
        <p className="text-sm text-mole/70 mb-3">
          {t("admin.receipts.dropHint")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud className="h-4 w-4" />
            {t("admin.receipts.chooseFile")}
          </Button>
          <Button
            disabled={uploading}
            variant="oro"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {t("admin.receipts.takePhoto")}
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onUpload(f);
          }}
        />
      </div>

      <p className="text-xs text-mole/60 italic">
        {t("admin.receipts.parsingStubNote")}
      </p>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-mole/60">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-mole/60">{t("admin.receipts.empty")}</p>
        ) : (
          rows.map((r) => (
            <ReceiptRowCard key={r.id} row={r} onReload={load} />
          ))
        )}
      </div>
    </div>
  );
}

function ReceiptRowCard({
  row,
  onReload,
}: {
  row: ReceiptRow;
  onReload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [pending, startTransition] = React.useTransition();
  const [storeName, setStoreName] = React.useState(row.store_name ?? "");
  const [purchaseDate, setPurchaseDate] = React.useState(
    row.purchase_date ?? "",
  );
  const [total, setTotal] = React.useState(
    row.parsed_total != null ? String(row.parsed_total) : "",
  );
  const [category, setCategory] = React.useState<ExpenseCategory>("misc");

  const save = () =>
    startTransition(async () => {
      const r = await approveReceipt(row.id, {
        store_name: storeName || null,
        purchase_date: purchaseDate || null,
        parsed_total: total ? Number(total) : null,
      });
      if (r.success) {
        toast.success(t("admin.receipts.saved"));
        void onReload();
      } else toast.error(r.error ?? t("common.error"));
    });

  const reject = () =>
    startTransition(async () => {
      const r = await rejectReceipt(row.id);
      if (r.success) void onReload();
      else toast.error(r.error ?? t("common.error"));
    });

  const convert = () =>
    startTransition(async () => {
      const r = await convertReceiptToExpense(row.id, category);
      if (r.success) {
        toast.success(t("admin.receipts.convertedToExpense"));
        void onReload();
      } else toast.error(r.error ?? t("common.error"));
    });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-mono text-mole/70 truncate">
          {row.storage_path}
        </CardTitle>
        <Badge
          variant={
            row.status === "approved"
              ? "default"
              : row.status === "rejected"
                ? "sale"
                : "outline"
          }
        >
          {row.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <Label>{t("admin.receipts.storeName")}</Label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("admin.receipts.purchaseDate")}</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("admin.receipts.total")}</Label>
            <Input
              type="number"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={pending}>
            <CheckCircle2 className="h-4 w-4" />
            {t("admin.receipts.approve")}
          </Button>
          <Button onClick={reject} disabled={pending} variant="destructive">
            <XCircle className="h-4 w-4" />
            {t("admin.receipts.reject")}
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={convert}
              disabled={pending || !total}
              variant="oro"
            >
              {t("admin.receipts.convertToExpense")}
            </Button>
          </div>
        </div>
        {row.notes ? (
          <p className="text-xs text-mole/60 italic">{row.notes}</p>
        ) : null}
        <p className="text-xs text-mole/50">
          {t("admin.receipts.uploadedAt", {
            when: format(new Date(row.created_at), "PPp"),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
