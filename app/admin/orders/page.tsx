"use client";

import * as React from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill, PaymentPill } from "../_components/StatusPill";
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

function toCsv(rows: Row[], names: Record<string, string>): string {
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
    const profileName = r.customer_id ? names[r.customer_id] : undefined;
    lines.push(
      [
        r.order_number,
        JSON.stringify(r.guest_name ?? profileName ?? r.customer_id ?? ""),
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
  const [customerNames, setCustomerNames] = React.useState<Record<string, string>>({});
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
      setCustomerNames({});
    } else {
      const allRows = data as Row[];
      const ids = Array.from(
        new Set(
          allRows
            .filter((r) => !r.guest_name && r.customer_id)
            .map((r) => r.customer_id as string),
        ),
      );
      const nameMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("customer_profiles")
          .select("id, full_name")
          .in("id", ids);
        (profiles ?? []).forEach((p) => {
          if (p.full_name) nameMap[p.id] = p.full_name;
        });
      }
      const filtered = allRows.filter((r) => {
        if (!search) return true;
        const s = search.toLowerCase();
        const profileName = r.customer_id ? (nameMap[r.customer_id] ?? "") : "";
        return (
          r.order_number.toLowerCase().includes(s) ||
          (r.guest_name ?? "").toLowerCase().includes(s) ||
          (r.guest_phone ?? "").toLowerCase().includes(s) ||
          profileName.toLowerCase().includes(s)
        );
      });
      setRows(filtered);
      setCustomerNames(nameMap);
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
    const csv = toCsv(rows, customerNames);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl text-mole">
          {t("admin.orders.title")}
        </h1>
        <Button variant="outline" size="lg" onClick={exportCsv}>
          <Download className="h-5 w-5" />
          {t("admin.orders.exportCsv")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mole/40" />
            <Input
              placeholder={t("admin.orders.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-10 text-base"
            />
          </div>
          <Input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            aria-label={t("admin.orders.pickupDateFilter")}
            className="h-12 text-base"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}
          >
            <SelectTrigger className="h-12 text-base">
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
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-oro/20 px-5 py-3 ring-1 ring-oro/30">
          <span className="text-base font-medium text-mole">
            {t("admin.orders.selectedCount", { count: selected.size })}
          </span>
          <Button size="lg" onClick={() => doBulk("confirmed")}>
            {t("admin.orders.confirmSelected")}
          </Button>
          <Button size="lg" variant="oro" onClick={() => doBulk("ready")}>
            {t("admin.orders.markReady")}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-nopal/10 bg-papel-warm overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-nopal/10 bg-papel text-left text-sm uppercase tracking-wide text-mole/60">
              <th className="p-4 w-12">
                <Checkbox
                  checked={rows.length > 0 && selected.size === rows.length}
                  onCheckedChange={toggleAll}
                  aria-label={t("admin.orders.selectAll")}
                />
              </th>
              <th className="p-4">{t("admin.orders.col_customer")}</th>
              <th className="p-4">{t("admin.orders.col_pickupDate")}</th>
              <th className="p-4 text-right">{t("admin.orders.col_lbs")}</th>
              <th className="p-4 text-right">{t("admin.orders.col_total")}</th>
              <th className="p-4">{t("admin.orders.col_payment")}</th>
              <th className="p-4">{t("admin.orders.col_status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-mole/60 text-lg">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-mole/60 text-lg">
                  {t("admin.orders.noneFound")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-nopal/5 hover:bg-papel/40"
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label="select row"
                    />
                  </td>
                  <td className="p-4">
                    <Link href={`/admin/orders/${r.id}`} className="block group">
                      <div className="text-lg font-semibold text-mole group-hover:text-nopal">
                        {r.guest_name ??
                          (r.customer_id ? customerNames[r.customer_id] : null) ??
                          t("admin.orders.registeredCustomer")}
                      </div>
                      <div className="text-sm text-mole/60">
                        {r.order_number}
                        {r.guest_phone ? ` · ${r.guest_phone}` : ""}
                      </div>
                    </Link>
                  </td>
                  <td className="p-4 text-mole">
                    {format(new Date(`${r.pickup_date}T12:00:00`), "EEE MMM d")}
                  </td>
                  <td className="p-4 text-right tabular-nums">
                    {Number(r.total_lbs).toFixed(1)}
                  </td>
                  <td className="p-4 text-right font-display text-lg text-mole tabular-nums">
                    {fmtMoney(Number(r.total))}
                  </td>
                  <td className="p-4">
                    <PaymentPill status={r.payment_status} />
                  </td>
                  <td className="p-4">
                    <StatusPill status={r.status} />
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
          <p className="text-center text-mole/60 py-8 text-lg">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-mole/60 py-8 text-lg">
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
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-mole truncate">
                        {r.guest_name ??
                        (r.customer_id ? customerNames[r.customer_id] : null) ??
                        t("admin.orders.registeredCustomer")}
                      </p>
                      <p className="text-sm text-mole/60 truncate">
                        {r.order_number}
                        {r.guest_phone ? ` · ${r.guest_phone}` : ""}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  <div className="flex items-center justify-between text-base">
                    <span className="text-mole/70">
                      {format(new Date(`${r.pickup_date}T12:00:00`), "EEE MMM d")}
                    </span>
                    <span className="font-display text-lg text-mole tabular-nums">
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
