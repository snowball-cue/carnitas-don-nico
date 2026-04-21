"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Flame,
  HandCoins,
  Trash2,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  updateOrderStatus,
  recordPayment,
  addOrderNote,
  deleteOrder,
} from "@/app/actions/admin/orders";
import type { OrderStatus, PaymentMethod } from "@/types/database";

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  initialNotes: string;
  status: OrderStatus;
  depositPaid: number;
  total: number;
}

export function OrderActions({
  orderId,
  orderNumber,
  initialNotes,
  status,
  depositPaid,
  total,
}: OrderActionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [notes, setNotes] = React.useState(initialNotes);
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [amount, setAmount] = React.useState<string>(
    Math.max(0, total - depositPaid).toFixed(2),
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const doDelete = () =>
    startTransition(async () => {
      const res = await deleteOrder(orderId);
      if (res.success) {
        toast.success(t("admin.orderDetail.deleted"));
        setDeleteOpen(false);
        router.push("/admin/orders");
        router.refresh();
      } else {
        toast.error(res.error ?? t("common.error"));
      }
    });

  const doStatus = (next: OrderStatus) =>
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, next);
      if (res.success) toast.success(t("admin.orderDetail.statusUpdated"));
      else toast.error(res.error ?? t("common.error"));
    });

  const doNotes = () =>
    startTransition(async () => {
      const res = await addOrderNote(orderId, notes);
      if (res.success) toast.success(t("admin.orderDetail.notesSaved"));
      else toast.error(res.error ?? t("common.error"));
    });

  const doPayment = () =>
    startTransition(async () => {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error(t("admin.orderDetail.invalidAmount"));
        return;
      }
      const res = await recordPayment(orderId, n, method);
      if (res.success) toast.success(t("admin.orderDetail.paymentRecorded"));
      else toast.error(res.error ?? t("common.error"));
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.orderDetail.statusTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            onClick={() => doStatus("confirmed")}
            disabled={pending || status === "confirmed"}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t("admin.orderDetail.confirm")}
          </Button>
          <Button
            variant="oro"
            onClick={() => doStatus("ready")}
            disabled={pending || status === "ready"}
          >
            <Flame className="h-4 w-4" />
            {t("admin.orderDetail.markReady")}
          </Button>
          <Button
            variant="outline"
            onClick={() => doStatus("picked_up")}
            disabled={pending || status === "picked_up"}
          >
            <HandCoins className="h-4 w-4" />
            {t("admin.orderDetail.markPickedUp")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => doStatus("cancelled")}
            disabled={pending || status === "cancelled"}
          >
            <XCircle className="h-4 w-4" />
            {t("admin.orderDetail.cancel")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => doStatus("no_show")}
            disabled={pending || status === "no_show"}
            className="col-span-2"
          >
            {t("admin.orderDetail.markNoShow")}
          </Button>
          <Button
            variant="outline"
            className="col-span-2"
            onClick={() =>
              toast.info(t("admin.orderDetail.smsStub"))
            }
          >
            <MessageSquare className="h-4 w-4" />
            {t("admin.orderDetail.sendSms")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.orderDetail.paymentTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={t("admin.orderDetail.amount")}
            />
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="cashapp">CashApp</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={doPayment} disabled={pending} className="w-full">
            {t("admin.orderDetail.recordPayment")}
          </Button>
          <p className="text-xs text-mole/60">
            {t("admin.orderDetail.paidSoFar", {
              paid: depositPaid.toFixed(2),
              total: total.toFixed(2),
            })}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.orderDetail.notes")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("admin.orderDetail.notesPlaceholder")}
          />
          <div className="flex justify-end">
            <Button onClick={doNotes} disabled={pending}>
              {t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            {t("admin.orderDetail.dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-mole/70">
            {t("admin.orderDetail.deleteHelp")}
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" />
            {t("admin.orderDetail.deleteOrder")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.orderDetail.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.orderDetail.deleteConfirmBody", { orderNumber })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={doDelete}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" />
              {t("admin.orderDetail.deleteOrder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
