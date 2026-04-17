"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import {
  upsertShoppingItem,
  markPurchased,
  deleteShoppingItem,
} from "@/app/actions/admin/shopping";
import type { ShoppingListRow } from "@/types/database";

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

export default function AdminShoppingListPage() {
  const { t } = useTranslation();
  const supabase = React.useMemo(() => getClient(), []);
  const [items, setItems] = React.useState<ShoppingListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [upcomingFilter, setUpcomingFilter] = React.useState<string>("");

  const [newItem, setNewItem] = React.useState({
    item_name_en: "",
    item_name_es: "",
    quantity: "",
    unit: "",
    estimated_cost: "",
    needed_by_date: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("shopping_list")
      .select("*")
      .order("is_purchased", { ascending: true })
      .order("needed_by_date", { ascending: true })
      .limit(200);
    if (upcomingFilter) q = q.eq("needed_by_date", upcomingFilter);
    const { data } = await q;
    setItems((data as ShoppingListRow[]) ?? []);
    setLoading(false);
  }, [supabase, upcomingFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const addItem = async () => {
    if (!newItem.item_name_en) return;
    const r = await upsertShoppingItem({
      item_name_en: newItem.item_name_en,
      item_name_es: newItem.item_name_es || null,
      quantity: newItem.quantity ? Number(newItem.quantity) : null,
      unit: newItem.unit || null,
      estimated_cost: newItem.estimated_cost
        ? Number(newItem.estimated_cost)
        : null,
      needed_by_date: newItem.needed_by_date || null,
    });
    if (r.success) {
      setNewItem({
        item_name_en: "",
        item_name_es: "",
        quantity: "",
        unit: "",
        estimated_cost: "",
        needed_by_date: "",
      });
      void load();
    } else toast.error(r.error ?? t("common.error"));
  };

  const togglePurchased = async (id: string, v: boolean) => {
    const r = await markPurchased(id, v);
    if (r.success) void load();
    else toast.error(r.error ?? t("common.error"));
  };

  const onDelete = async (id: string) => {
    const r = await deleteShoppingItem(id);
    if (r.success) void load();
    else toast.error(r.error ?? t("common.error"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-mole">
          {t("admin.shopping.title")}
        </h1>
        <Input
          type="date"
          value={upcomingFilter}
          onChange={(e) => setUpcomingFilter(e.target.value)}
          aria-label={t("admin.shopping.filterDate")}
          className="w-auto"
        />
      </div>

      {/* Suggestion panel (stub) */}
      <Card className="border border-oro/40 bg-oro/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-oro-light shrink-0" />
          <div>
            <p className="font-semibold text-mole">
              {t("admin.shopping.suggestionTitle")}
            </p>
            <p className="text-sm text-mole/70">
              {t("admin.shopping.suggestionStub")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick add */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("admin.shopping.addItem")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <Input
            placeholder="EN"
            value={newItem.item_name_en}
            onChange={(e) =>
              setNewItem((f) => ({ ...f, item_name_en: e.target.value }))
            }
          />
          <Input
            placeholder="ES"
            value={newItem.item_name_es}
            onChange={(e) =>
              setNewItem((f) => ({ ...f, item_name_es: e.target.value }))
            }
          />
          <Input
            type="number"
            step="0.1"
            placeholder={t("admin.shopping.qty")}
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem((f) => ({ ...f, quantity: e.target.value }))
            }
          />
          <Input
            placeholder={t("admin.shopping.unit")}
            value={newItem.unit}
            onChange={(e) => setNewItem((f) => ({ ...f, unit: e.target.value }))}
          />
          <Input
            type="number"
            step="0.01"
            placeholder={t("admin.shopping.estCost")}
            value={newItem.estimated_cost}
            onChange={(e) =>
              setNewItem((f) => ({ ...f, estimated_cost: e.target.value }))
            }
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={newItem.needed_by_date}
              onChange={(e) =>
                setNewItem((f) => ({ ...f, needed_by_date: e.target.value }))
              }
            />
            <Button onClick={addItem} size="icon" disabled={!newItem.item_name_en}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-mole/60">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-mole/60">
              {t("admin.shopping.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-nopal/10">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-3 p-3 hover:bg-papel/40"
                >
                  <Checkbox
                    checked={it.is_purchased}
                    onCheckedChange={(v) => void togglePurchased(it.id, !!v)}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        it.is_purchased
                          ? "line-through text-mole/50"
                          : "text-mole"
                      }`}
                    >
                      {it.item_name_en}
                      {it.item_name_es ? (
                        <span className="text-mole/60">
                          {" "}
                          / {it.item_name_es}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-mole/60">
                      {it.quantity != null
                        ? `${it.quantity}${it.unit ? ` ${it.unit}` : ""}`
                        : ""}
                      {it.estimated_cost
                        ? ` · ~$${Number(it.estimated_cost).toFixed(2)}`
                        : ""}
                      {it.needed_by_date
                        ? ` · ${format(new Date(`${it.needed_by_date}T12:00:00`), "MMM d")}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void onDelete(it.id)}
                  >
                    <Trash2 className="h-4 w-4 text-chile" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
