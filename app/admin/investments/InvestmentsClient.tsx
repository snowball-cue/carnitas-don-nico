"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { upsertInvestment } from "@/app/actions/admin/investments";

export function InvestmentsClient() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    item_name: "",
    cost: "",
    purchase_date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    notes: "",
  });

  const submit = () =>
    startTransition(async () => {
      const r = await upsertInvestment({
        item_name: form.item_name,
        cost: Number(form.cost),
        purchase_date: form.purchase_date,
        category: form.category || null,
        notes: form.notes || null,
      });
      if (r.success) {
        toast.success(t("admin.investments.created"));
        setOpen(false);
        setForm({
          item_name: "",
          cost: "",
          purchase_date: format(new Date(), "yyyy-MM-dd"),
          category: "",
          notes: "",
        });
        window.location.reload();
      } else toast.error(r.error ?? t("common.error"));
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {t("admin.investments.addInvestment")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.investments.addInvestment")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("admin.investments.itemName")}</Label>
            <Input
              value={form.item_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, item_name: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("admin.investments.cost")}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("admin.investments.purchaseDate")}</Label>
              <Input
                type="date"
                value={form.purchase_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purchase_date: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Label>{t("admin.investments.category")}</Label>
            <Input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="equipment / vehicle / marketing…"
            />
          </div>
          <div>
            <Label>{t("admin.investments.notes")}</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !form.item_name || !form.cost}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
