"use client";

import Link from "next/link";
import { CalendarPlus, Receipt, Megaphone, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function QuickActions() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Button asChild variant="oro" size="lg">
        <Link href="/admin/calendar">
          <CalendarPlus className="h-4 w-4" />
          {t("admin.quickActions.newPickup")}
        </Link>
      </Button>
      <Button asChild variant="default" size="lg">
        <Link href="/admin/expenses">
          <PlusCircle className="h-4 w-4" />
          {t("admin.quickActions.addExpense")}
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link href="/admin/receipts">
          <Receipt className="h-4 w-4" />
          {t("admin.quickActions.scanReceipt")}
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link href="/admin/notifications">
          <Megaphone className="h-4 w-4" />
          {t("admin.quickActions.notifyCustomers")}
        </Link>
      </Button>
    </div>
  );
}
