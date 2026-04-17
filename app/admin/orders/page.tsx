"use client";

import * as React from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { bulkUpdateStatus } from "@/app/actions/admin/orders";
import type { OrderRow, OrderStatus } from "@/types/database";
import { toast } from "sonner";

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "ready",
  "picked_up",
  "cancelled",
  "no_show",
];

type Row = Pick<
  OrderRow,
  | "id"
  | "order_number"
  | "guest_name"
  | "guest_phone"
  | "customer_id"
  | "pickup_date"
  | "total_lbs"
  | "total"
  | "payment_status"
  | "status"
  | "created_at"
>;

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function statusBadgeVariant(
  s: OrderStatus,
): "default" | "oro" | "outline" | "sale" {
  if (s === "pending") return "outline";
  if (s === "confirmed" || s === "ready") return "oro";
  if (s === "picked_up") return "default";
  if (s === "cancelled" || s === "no_show") return "sale";
  return "default";
}

function toCsv(rows: Row[]): string {
  const header = [
    "order_number",
    "customer",
    "phone",
    "pickup_date",
    "total_lbs",
    "total",
    "payment_status",
    "status",
    "created_at",
  ];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    lines.push(
      [
        r.order_number,
        JSON.stringify(r.guest_name ?? r.customer_id ?? ""),
        JSON.stringify(r.guest_phone ?? ""),
        r.pickup_date,
        r.total_lbs,
        r.total,
        r.payment_status,
        r.status,
        r.created_at,
      ].join(","),
    );
  });
  return lines.join("\n");
}

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const supabase = React.useMemo(() => getClient(), []);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [pickupDate, setPickupDate] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("orders")
      .select(
        "id, order_number, guest_name, guest_phone, customer_id, pickup_date, total_lbs, total, payment_status, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (pickupDate) q = q.eq("pickup_date", pickupDate);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);

    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      const filtered = (data as Row[]).filter((r) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          r.order_number.toLowerCase().includes(s) ||
          (r.guest_name ?? "").toLowerCase().includes(s) ||
          (r.guest_phone ?? "").toLowerCase().includes(s)
        );
      });
      setRows(filtered);
    }
    setLoading(false);
  }, [supabase, pickupDate, statusFilter, search]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const doBulk = async (status: OrderStatus) => {
    if (selected.size === 0) return;
    const res = await bulkUpdateStatus(Array.from(selected), status);
    if (res.success) {
      toast.success(t("admin.orders.bulkUpdated", { count: selected.size }));
      setSelected(new Set());
      void load();
    } else {
      toast.error(res.error ?? t("common.error"));
    }
  };

  const exportCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-mole">
          {t("admin.orders.title")}
        </h1>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          {t("admin.orders.exportCsv")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mole/40" />
            <Input
              placeholder={t("admin.orders.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            aria-label={t("admin.orders.pickupDateFilter")}
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.orders.statusAll")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`admin.orders.status_${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bulk bar */}
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-oro/20 px-4 py-2">
          <span className="text-sm text-mole">
            {t("admin.orders.selectedCount", { count: selected.size })}
          </span>
          <Button size="sm" onClick={() => doBulk("confirmed")}>
            {t("admin.orders.confirmSelected")}
          </Button>
          <Button size="sm" variant="oro" onClick={() => doBulk("ready")}>
            {t("admin.orders.markReady")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border border-nopal/10 bg-papel-warm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nopal/10 bg-papel text-left text-xs uppercase tracking-wide text-mole/60">
              <th className="p-3 w-10">
                <Checkbox
                  checked={rows.length > 0 && selected.size === rows.length}
                  onCheckedChange={toggleAll}
                  aria-label={t("admin.orders.selectAll")}
                />
              </th>
              <th className="p-3">{t("admin.orders.col_orderNumber")}</th>
              <th className="p-3">{t("admin.orders.col_customer")}</th>
              <th className="p-3">{t("admin.orders.col_pickupDate")}</th>
              <th className="p-3 text-right">{t("admin.orders.col_lbs")}</th>
              <th className="p-3 text-right">{t("admin.orders.col_total")}</th>
              <th className="p-3">{t("admin.orders.col_payment")}</th>
              <th className="p-3">{t("admin.orders.col_status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-mole/60">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-mole/60">
                  {t("admin.orders.noneFound")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-nopal/5 hover:bg-papel/40"
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label="select row"
                    />
                  </td>
                  <td className="p-3 font-mono">
                    <Link
                      href={`/admin/orders/${r.id}`}
                      className="text-nopal hover:underline"
                    >
                      {r.order_number}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">
                      {r.guest_name ?? t("admin.orders.registeredCustomer")}
                    </div>
                    <div className="text-xs text-mole/60">{r.guest_phone ?? ""}</div>
                  </td>
                  <td className="p-3">
                    {format(new Date(`${r.pickup_date}T12:00:00`), "MMM d")}
                  </td>
                  <td className="p-3 text-right">{Number(r.total_lbs).toFixed(1)}</td>
                  <td className="p-3 text-right font-mono">
                    {fmtMoney(Number(r.total))}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">
                      {t(`admin.orders.payment_${r.payment_status}`)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={statusBadgeVariant(r.status)}>
                      {t(`admin.orders.status_${r.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center text-mole/60 py-6">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-mole/60 py-6">
            {t("admin.orders.noneFound")}
          </p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/orders/${r.id}`}
              className="block"
            >
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm text-nopal">
                        {r.order_number}
                      </p>
                      <p className="font-medium">
                        {r.guest_name ?? t("admin.orders.registeredCustomer")}
                      </p>
                      {r.guest_phone ? (
                        <p className="text-xs text-mole/60">{r.guest_phone}</p>
                      ) : null}
                    </div>
                    <Badge variant={statusBadgeVariant(r.status)}>
                      {t(`admin.orders.status_${r.status}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mole/70">
                      {format(new Date(`${r.pickup_date}T12:00:00`), "MMM d")}
                    </span>
                    <span className="font-mono">
                      {Number(r.total_lbs).toFixed(1)} lb · {fmtMoney(Number(r.total))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
