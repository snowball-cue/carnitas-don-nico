"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createGroup,
  updateGroup,
  deleteGroup,
} from "@/app/actions/admin/marketing";
import type { GroupRow } from "@/app/actions/admin/marketing";

const COLORS = [
  { id: "nopal", cls: "bg-nopal text-papel" },
  { id: "oro", cls: "bg-oro text-mole" },
  { id: "chile", cls: "bg-chile text-papel" },
  { id: "jamaica", cls: "bg-jamaica text-papel" },
  { id: "talavera", cls: "bg-talavera text-papel" },
  { id: "agave", cls: "bg-agave text-papel" },
] as const;

function colorCls(color: string): string {
  return COLORS.find((c) => c.id === color)?.cls ?? "bg-oro text-mole";
}

export function GroupsClient({
  initialGroups,
}: {
  initialGroups: GroupRow[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GroupRow | null>(null);

  function openNew() {
    setEditing(null);
    setDlgOpen(true);
  }
  function openEdit(g: GroupRow) {
    setEditing(g);
    setDlgOpen(true);
  }

  async function onDelete(g: GroupRow) {
    if (!window.confirm(t("admin.groups.confirmDelete"))) return;
    const res = await deleteGroup(g.id);
    if (res.success) {
      toast.success(t("admin.groups.deleted"));
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-mole">
            {t("admin.groups.title")}
          </h1>
          <p className="text-sm text-mole/60">{t("admin.groups.subtitle")}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          {t("admin.groups.newGroup")}
        </Button>
      </div>

      {initialGroups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-mole/60">
            {t("admin.groups.none")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initialGroups.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/groups/${g.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${colorCls(g.color)}`}
                      />
                      <h3 className="font-display text-lg text-mole truncate hover:underline">
                        {g.name}
                      </h3>
                    </div>
                    {g.description ? (
                      <p className="text-xs text-mole/60 mt-1 line-clamp-2">
                        {g.description}
                      </p>
                    ) : null}
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(g)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(g)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-mole/60">
                  {t("admin.groups.memberCount", { count: g.member_count })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupDialog
        open={dlgOpen}
        onOpenChange={setDlgOpen}
        editing={editing}
      />
    </div>
  );
}

function GroupDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: GroupRow | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState<string>("oro");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setColor(editing?.color ?? "oro");
    }
  }, [open, editing]);

  async function onSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    const res = editing
      ? await updateGroup(editing.id, {
          name: name.trim(),
          description: description.trim() || null,
          color,
        })
      : await createGroup({
          name: name.trim(),
          description: description.trim() || null,
          color,
        });
    setSubmitting(false);
    if (res.success) {
      toast.success(
        editing ? t("admin.groups.saved") : t("admin.groups.created"),
      );
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
          <DialogTitle>
            {editing ? t("admin.groups.editGroup") : t("admin.groups.newGroup")}
          </DialogTitle>
          <DialogDescription>{t("admin.groups.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-mole/70 uppercase tracking-wide">
              {t("admin.groups.name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.groups.namePlaceholder")}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-mole/70 uppercase tracking-wide">
              {t("admin.groups.description")}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("admin.groups.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-mole/70 uppercase tracking-wide">
              {t("admin.groups.color")}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`h-8 w-8 rounded-full ${c.cls} transition-all ${
                    color === c.id ? "ring-2 ring-mole ring-offset-2" : ""
                  }`}
                  aria-label={c.id}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !name.trim()}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
