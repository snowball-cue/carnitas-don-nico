"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  addToGroup,
  removeFromGroup,
} from "@/app/actions/admin/marketing";
import type {
  ContactRow,
  GroupRow,
} from "@/app/actions/admin/marketing";

export function GroupDetailClient({
  group,
  allContacts,
  allGroups,
}: {
  group: { id: string; name: string; description: string | null; color: string };
  allContacts: ContactRow[];
  allGroups: GroupRow[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);

  const members = React.useMemo(
    () => allContacts.filter((c) => c.group_ids.includes(group.id)),
    [allContacts, group.id],
  );

  const filteredMembers = React.useMemo(() => {
    const n = search.trim().toLowerCase();
    if (!n) return members;
    return members.filter(
      (c) =>
        c.email.toLowerCase().includes(n) ||
        (c.name ?? "").toLowerCase().includes(n),
    );
  }, [members, search]);

  async function onRemove(c: ContactRow) {
    const input = c.is_customer
      ? { group_id: group.id, customer_id: c.customer_id! }
      : { group_id: group.id, email: c.email };
    const res = await removeFromGroup(input);
    if (res.success) {
      toast.success(t("admin.groups.removed"));
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  // unused but keeps import tree aware of allGroups for future cross-group UI
  void allGroups;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/groups">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-mole truncate">
            {group.name}
          </h1>
          {group.description ? (
            <p className="text-sm text-mole/60">{group.description}</p>
          ) : null}
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("admin.groups.addMembers")}
        </Button>
      </div>

      <Input
        placeholder={t("admin.contacts.searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Card>
        <CardContent className="p-0">
          {filteredMembers.length === 0 ? (
            <div className="p-6 text-center text-mole/60">
              {t("admin.groups.noMembers")}
            </div>
          ) : (
            <ul className="divide-y divide-nopal/10">
              {filteredMembers.map((c) => (
                <li
                  key={c.key}
                  className="flex items-center gap-3 p-3 hover:bg-papel/40"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nopal text-papel text-xs font-semibold shrink-0">
                    {(c.name ?? c.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-mole truncate">
                      {c.name ?? "—"}
                    </div>
                    <div className="text-xs text-mole/60 truncate">
                      {c.email}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(c)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("admin.groups.remove")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddMembersDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        group={group}
        allContacts={allContacts}
      />
    </div>
  );
}

function AddMembersDialog({
  open,
  onOpenChange,
  group,
  allContacts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: { id: string };
  allContacts: ContactRow[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const nonMembers = React.useMemo(
    () => allContacts.filter((c) => !c.group_ids.includes(group.id)),
    [allContacts, group.id],
  );

  const filtered = React.useMemo(() => {
    const n = search.trim().toLowerCase();
    const base = n
      ? nonMembers.filter(
          (c) =>
            c.email.toLowerCase().includes(n) ||
            (c.name ?? "").toLowerCase().includes(n),
        )
      : nonMembers;
    return base.slice(0, 100);
  }, [nonMembers, search]);

  async function onAdd(c: ContactRow) {
    setBusyKey(c.key);
    const input = c.is_customer
      ? { group_id: group.id, customer_id: c.customer_id! }
      : { group_id: group.id, email: c.email };
    const res = await addToGroup(input);
    setBusyKey(null);
    if (res.success) {
      toast.success(t("admin.contacts.addedToGroup"));
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.groups.addMembers")}</DialogTitle>
          <DialogDescription>
            {t("admin.contacts.searchPlaceholder")}
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder={t("admin.contacts.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={busyKey === c.key}
              onClick={() => onAdd(c)}
              className="w-full rounded border border-nopal/20 px-3 py-2 text-left text-sm hover:bg-papel-warm disabled:opacity-50"
            >
              <div className="font-medium">{c.name ?? c.email}</div>
              <div className="text-xs text-mole/60">{c.email}</div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="text-sm text-mole/60 text-center p-3">—</p>
          ) : null}
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
