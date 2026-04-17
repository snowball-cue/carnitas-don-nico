"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  createExpense,
  deleteExpense,
  createManualRevenue,
} from "@/app/actions/admin/expenses";
import type {
  ExpenseCategory,
  ExpenseRow,
  ManualRevenueRow,
} from "@/types/database";

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

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function firstOfMonth() {
  const d = new Date();
  return format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd");
}
function today() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function AdminExpensesPage() {
  const { t } = useTranslation();
  const supabase = React.useMemo(() => getClient(), []);
  const [from, setFrom] = React.useState(firstOfMonth());
  const [to, setTo] = React.useState(today());
  const [expenses, setExpenses] = React.useState<ExpenseRow[]>([]);
  const [manual, setManual] = React.useState<ManualRevenueRow[]>([]);
  const [orderRevenue, setOrderRevenue] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [expRes, manRes, ordRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", from)
        .lte("expense_date", to)
        .order("expense_date", { ascending: false }),
      supabase
        .from("manual_revenue")
        .select("*")
        .gte("event_date", from)
        .lte("event_date", to)
        .order("event_date", { ascending: false }),
      supabase
        .from("orders")
        .select("total")
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`)
        .in("payment_status", ["paid", "deposit_paid"]),
    ]);
    setExpenses((expRes.data as ExpenseRow[]) ?? []);
    setManual((manRes.data as ManualRevenueRow[]) ?? []);
    setOrderRevenue(
      ((ordRes.data as Array<{ total: number | string | null }>) ?? []).reduce(
        (a, r) => a + Number(r.total ?? 0),
        0,
      ),
    );
    setLoading(false);
  }, [supabase, from, to]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const expenseTotal = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const manualRevenue = manual.reduce((a, m) => a + Number(m.amount), 0);
  const revenue = orderRevenue + manualRevenue;
  const profit = revenue - expenseTotal;

  const onDelete = async (id: string) => {
    const r = await deleteExpense(id);
    if (r.success) void load();
    else toast.error(r.error ?? t("common.error"));
  };

  const exportCsv = () => {
    const header = ["date", "category", "description", "amount"];
    const lines = [header.join(",")];
    expenses.forEach((e) =>
      lines.push(
        [
          e.expense_date,
          e.category,
          JSON.stringify(e.description ?? ""),
          e.amount,
        ].join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-mole">
          {t("admin.expenses.title")}
        </h1>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label={t("admin.expenses.from")}
            className="w-auto"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label={t("admin.expenses.to")}
            className="w-auto"
          />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            {t("admin.expenses.exportCsv")}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-mole/70">
              {t("admin.expenses.revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl text-agave-sage">
            {fmtMoney(revenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-mole/70">
              {t("admin.expenses.expenses")}
            </CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl text-chile">
            {fmtMoney(expenseTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-mole/70">
              {t("admin.expenses.profit")}
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`font-display text-3xl ${profit >= 0 ? "text-nopal" : "text-chile"}`}
          >
            {fmtMoney(profit)}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <AddExpenseDialog onCreated={() => void load()} />
        <AddManualRevenueDialog onCreated={() => void load()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.expenses.expensesList")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nopal/10 text-left text-xs uppercase text-mole/60">
                  <th className="p-3">{t("admin.expenses.col_date")}</th>
                  <th className="p-3">{t("admin.expenses.col_category")}</th>
                  <th className="p-3">{t("admin.expenses.col_description")}</th>
                  <th className="p-3 text-right">
                    {t("admin.expenses.col_amount")}
                  </th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-mole/60">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-mole/60">
                      {t("admin.expenses.none")}
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-nopal/5"
                    >
                      <td className="p-3">
                        {format(
                          new Date(`${e.expense_date}T12:00:00`),
                          "MMM d",
                        )}
                      </td>
                      <td className="p-3 text-xs font-mono text-mole/80">
                        {e.category}
                      </td>
                      <td className="p-3">{e.description ?? "—"}</td>
                      <td className="p-3 text-right font-mono text-chile">
                        {fmtMoney(Number(e.amount))}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void onDelete(e.id)}
                        >
                          <Trash2 className="h-4 w-4 text-chile" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Manual revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.expenses.manualRevenue")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nopal/10 text-left text-xs uppercase text-mole/60">
                  <th className="p-3">{t("admin.expenses.col_date")}</th>
                  <th className="p-3">{t("admin.expenses.col_description")}</th>
                  <th className="p-3 text-right">
                    {t("admin.expenses.col_lbs")}
                  </th>
                  <th className="p-3 text-right">
                    {t("admin.expenses.col_amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {manual.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-mole/60">
                      {t("admin.expenses.noneManual")}
                    </td>
                  </tr>
                ) : (
                  manual.map((m) => (
                    <tr key={m.id} className="border-b border-nopal/5">
                      <td className="p-3">
                        {format(new Date(`${m.event_date}T12:00:00`), "MMM d")}
                      </td>
                      <td className="p-3">{m.description ?? "—"}</td>
                      <td className="p-3 text-right">
                        {m.lbs_sold != null ? Number(m.lbs_sold).toFixed(1) : "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-agave-sage">
                        {fmtMoney(Number(m.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddExpenseDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    expense_date: today(),
    event_date: "",
    category: "carne" as ExpenseCategory,
    description: "",
    amount: "",
  });

  const submit = () =>
    startTransition(async () => {
      const r = await createExpense({
        expense_date: form.expense_date,
        event_date: form.event_date || null,
        category: form.category,
        description: form.description || null,
        amount: Number(form.amount),
      });
      if (r.success) {
        toast.success(t("admin.expenses.created"));
        setOpen(false);
        onCreated();
        setForm({
          expense_date: today(),
          event_date: "",
          category: "carne",
          description: "",
          amount: "",
        });
      } else toast.error(r.error ?? t("common.error"));
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {t("admin.expenses.addExpense")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.expenses.addExpense")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("admin.expenses.col_date")}</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expense_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>{t("admin.expenses.eventDate")}</Label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, event_date: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Label>{t("admin.expenses.col_category")}</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, category: v as ExpenseCategory }))
              }
            >
              <SelectTrigger>
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
          </div>
          <div>
            <Label>{t("admin.expenses.col_description")}</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>{t("admin.expenses.col_amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending || !form.amount}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddManualRevenueDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    event_date: today(),
    amount: "",
    lbs_sold: "",
    description: "",
  });
  const submit = () =>
    startTransition(async () => {
      const r = await createManualRevenue({
        event_date: form.event_date,
        amount: Number(form.amount),
        lbs_sold: form.lbs_sold ? Number(form.lbs_sold) : null,
        description: form.description || null,
      });
      if (r.success) {
        toast.success(t("admin.expenses.created"));
        setOpen(false);
        onCreated();
        setForm({
          event_date: today(),
          amount: "",
          lbs_sold: "",
          description: "",
        });
      } else toast.error(r.error ?? t("common.error"));
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="oro">
          <Plus className="h-4 w-4" />
          {t("admin.expenses.addManualRevenue")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.expenses.addManualRevenue")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("admin.expenses.eventDate")}</Label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, event_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>{t("admin.expenses.col_amount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("admin.expenses.col_lbs")}</Label>
              <Input
                type="number"
                step="0.1"
                value={form.lbs_sold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lbs_sold: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Label>{t("admin.expenses.col_description")}</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending || !form.amount}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
