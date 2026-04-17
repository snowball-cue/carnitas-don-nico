"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Copy, UserPlus, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { addToGroup } from "@/app/actions/admin/marketing";
import type {
  ContactRow,
  GroupRow,
} from "@/app/actions/admin/marketing";

type FilterMode =
  | "all"
  | "authenticated"
  | "guests"
  | "opt_in"
  | "new"
  | "recurring"
  | "vip"
  | "catering_prospect";

function badgeClassForGroupColor(color: string): string {
  switch (color) {
    case "nopal":
      return "bg-nopal text-papel";
    case "chile":
      return "bg-chile text-papel";
    case "jamaica":
      return "bg-jamaica text-papel";
    case "talavera":
      return "bg-talavera text-papel";
    case "agave":
      return "bg-agave text-papel";
    case "oro":
    default:
      return "bg-oro text-mole";
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function ContactsClient({
  initialContacts,
  groups,
}: {
  initialContacts: ContactRow[];
  groups: GroupRow[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sortBy, setSortBy] =
    React.useState<"name" | "orders" | "spent">("spent");

  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [dlgTargetKey, setDlgTargetKey] = React.useState<string | null>(null);

  const groupById = React.useMemo(() => {
    const m = new Map<string, GroupRow>();
    for (const g of groups) m.set(g.id, g);
    return m;
  }, [groups]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = initialContacts.filter((c) => {
      if (
        needle &&
        !(c.email.toLowerCase().includes(needle) ||
          (c.name ?? "").toLowerCase().includes(needle) ||
          (c.phone ?? "").toLowerCase().includes(needle))
      )
        return false;
      if (filterMode === "authenticated" && !c.is_customer) return false;
      if (filterMode === "guests" && c.is_customer) return false;
      if (filterMode === "opt_in" && !c.marketing_opt_in) return false;
      if (filterMode === "new" && c.order_count !== 1) return false;
      if (filterMode === "recurring" && c.order_count < 2) return false;
      if (
        filterMode === "vip" &&
        !(c.order_count >= 5 || c.total_spent >= 200)
      )
        return false;
      if (filterMode === "catering_prospect" && !c.is_catering_prospect)
        return false;
      if (activeGroupId && !c.group_ids.includes(activeGroupId)) return false;
      return true;
    });
    const sorted = [...rows].sort((a, b) => {
      if (sortBy === "name")
        return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortBy === "orders") return b.order_count - a.order_count;
      return b.total_spent - a.total_spent;
    });
    return sorted;
  }, [initialContacts, search, filterMode, activeGroupId, sortBy]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.key));

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleSelectAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const c of filtered) next.delete(c.key);
        return next;
      } else {
        const next = new Set(prev);
        for (const c of filtered) next.add(c.key);
        return next;
      }
    });
  }

  async function onCopyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(t("admin.contacts.copied"));
    } catch {
      toast.error("Copy failed");
    }
  }

  function onSendToSelected() {
    const keys = Array.from(selected);
    if (keys.length === 0) {
      toast.error(t("admin.contacts.none"));
      return;
    }
    // Pass emails (so the new-broadcast page can hydrate regardless of session)
    const keyedEmails = initialContacts
      .filter((c) => selected.has(c.key))
      .map((c) => c.email)
      .join(",");
    router.push(
      `/admin/broadcasts/new?contacts=${encodeURIComponent(keyedEmails)}`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-mole">
            {t("admin.contacts.title")}
          </h1>
          <p className="text-sm text-mole/60">{t("admin.contacts.subtitle")}</p>
        </div>
        {selected.size > 0 ? (
          <Button onClick={onSendToSelected} variant="oro">
            <Send className="h-4 w-4" />
            {t("admin.contacts.sendEmailSelected")} ({selected.size})
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Input
            placeholder={t("admin.contacts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "admin.contacts.filterAll"],
                ["authenticated", "admin.contacts.filterAuthenticated"],
                ["guests", "admin.contacts.filterGuests"],
                ["opt_in", "admin.contacts.filterMarketingOptIn"],
                ["new", "admin.contacts.segmentNew"],
                ["recurring", "admin.contacts.segmentRecurring"],
                ["vip", "admin.contacts.segmentVIP"],
                ["catering_prospect", "admin.contacts.segmentCatering"],
              ] as const
            ).map(([mode, key]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setFilterMode(mode);
                  setActiveGroupId(null);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === mode && !activeGroupId
                    ? "bg-nopal text-papel border-nopal"
                    : "border-nopal/30 text-mole hover:bg-papel-warm"
                }`}
              >
                {t(key)}
              </button>
            ))}
            {groups.length > 0 ? (
              <>
                <span className="mx-1 self-center text-xs text-mole/40">
                  · {t("admin.contacts.filterByGroup")}:
                </span>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setActiveGroupId((cur) => (cur === g.id ? null : g.id));
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity ${badgeClassForGroupColor(
                      g.color,
                    )} ${activeGroupId === g.id ? "opacity-100 ring-2 ring-mole/40" : "opacity-70 hover:opacity-100"}`}
                  >
                    {g.name}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nopal/10 text-left text-xs uppercase tracking-wide text-mole/60">
                <th className="p-3 w-8">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={() => toggleSelectAllVisible()}
                    aria-label={t("admin.contacts.selectAll")}
                  />
                </th>
                <th
                  className="p-3 cursor-pointer select-none"
                  onClick={() => setSortBy("name")}
                >
                  {t("admin.contacts.col_name")}
                </th>
                <th className="p-3">{t("admin.contacts.col_contact")}</th>
                <th className="p-3">{t("admin.contacts.col_type")}</th>
                <th
                  className="p-3 text-right cursor-pointer select-none"
                  onClick={() => setSortBy("orders")}
                >
                  {t("admin.contacts.col_orders")}
                </th>
                <th
                  className="p-3 text-right cursor-pointer select-none"
                  onClick={() => setSortBy("spent")}
                >
                  {t("admin.contacts.col_spent")}
                </th>
                <th className="p-3">{t("admin.contacts.col_groups")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-mole/60">
                    {t("admin.contacts.none")}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const initial = (c.name ?? c.email ?? "?")
                    .charAt(0)
                    .toUpperCase();
                  return (
                    <tr
                      key={c.key}
                      className={`border-b border-nopal/5 hover:bg-papel/40 ${
                        c.unsubscribed ? "opacity-60" : ""
                      }`}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selected.has(c.key)}
                          onCheckedChange={() => toggleSelect(c.key)}
                          aria-label={`Select ${c.email}`}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nopal text-papel text-xs font-semibold">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-mole truncate">
                              {c.name ?? "—"}
                            </div>
                            {c.unsubscribed ? (
                              <div className="text-[10px] uppercase text-chile font-bold">
                                {t("admin.contacts.unsubscribed")}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-mole/80">{c.email}</div>
                        {c.phone ? (
                          <div className="text-xs text-mole/50">{c.phone}</div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        {c.is_customer ? (
                          <Badge variant="default">
                            {t("admin.contacts.typeCustomer")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {t("admin.contacts.typeGuest")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">{c.order_count}</td>
                      <td className="p-3 text-right font-mono">
                        {fmtMoney(c.total_spent)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {c.group_ids.slice(0, 3).map((gid) => {
                            const g = groupById.get(gid);
                            if (!g) return null;
                            return (
                              <span
                                key={gid}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeClassForGroupColor(
                                  g.color,
                                )}`}
                              >
                                {g.name}
                              </span>
                            );
                          })}
                          {c.group_ids.length > 3 ? (
                            <span className="text-[10px] text-mole/40">
                              +{c.group_ids.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onCopyEmail(c.email)}
                            title={t("admin.contacts.copyEmail")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setDlgTargetKey(c.key);
                              setDlgOpen(true);
                            }}
                            title={t("admin.contacts.addToGroup")}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AddToGroupDialog
        open={dlgOpen}
        onOpenChange={setDlgOpen}
        contact={
          dlgTargetKey
            ? initialContacts.find((c) => c.key === dlgTargetKey) ?? null
            : null
        }
        groups={groups}
      />
    </div>
  );
}

function AddToGroupDialog({
  open,
  onOpenChange,
  contact,
  groups,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: ContactRow | null;
  groups: GroupRow[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState<string | null>(null);

  async function onAdd(groupId: string) {
    if (!contact) return;
    setSubmitting(groupId);
    const input = contact.is_customer
      ? { group_id: groupId, customer_id: contact.customer_id! }
      : { group_id: groupId, email: contact.email };
    const res = await addToGroup(input);
    setSubmitting(null);
    if (res.success) {
      toast.success(t("admin.contacts.addedToGroup"));
      router.refresh();
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.contacts.addToGroup")}</DialogTitle>
          <DialogDescription>
            {contact?.name ?? contact?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {groups.length === 0 ? (
            <p className="text-sm text-mole/60">{t("admin.groups.none")}</p>
          ) : (
            groups.map((g) => {
              const already = contact?.group_ids.includes(g.id) ?? false;
              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={already || submitting === g.id}
                  onClick={() => onAdd(g.id)}
                  className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                    already
                      ? "bg-papel-warm border-nopal/10 text-mole/60"
                      : "border-nopal/20 hover:bg-papel-warm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{g.name}</span>
                    {already ? (
                      <Check className="h-4 w-4 text-nopal" />
                    ) : (
                      <span className="text-xs text-mole/50">
                        {t("admin.groups.memberCount", { count: g.member_count })}
                      </span>
                    )}
                  </div>
                  {g.description ? (
                    <div className="text-xs text-mole/50 mt-0.5">
                      {g.description}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
