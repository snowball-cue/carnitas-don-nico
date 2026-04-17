"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Send, Save } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createBroadcast,
  resolveRecipients,
  sendBroadcast,
} from "@/app/actions/admin/marketing";
import type {
  ContactRow,
  GroupRow,
  RecipientFilter,
  SmartSegment,
} from "@/app/actions/admin/marketing";
import type { BroadcastLocale } from "@/types/database";

type RecipientMode =
  | "everyone"
  | "groups"
  | "segments"
  | "individuals"
  | "mix";

export function NewBroadcastClient({
  contacts,
  groups,
  isTestMode,
  testModeCap,
}: {
  contacts: ContactRow[];
  groups: GroupRow[];
  isTestMode: boolean;
  testModeCap: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const sp = useSearchParams();

  // Pre-fill individual contacts from ?contacts=email1,email2
  const prefillEmails = React.useMemo(() => {
    const raw = sp?.get("contacts");
    if (!raw) return [] as string[];
    return raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }, [sp]);

  const [subject, setSubject] = React.useState("");
  const [locale, setLocale] = React.useState<BroadcastLocale>("es");
  const [body, setBody] = React.useState("");
  const [mode, setMode] = React.useState<RecipientMode>(
    prefillEmails.length > 0 ? "individuals" : "everyone",
  );
  const [selectedGroups, setSelectedGroups] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedSegments, setSelectedSegments] = React.useState<
    Set<SmartSegment>
  >(new Set());
  const [selectedIndividuals, setSelectedIndividuals] = React.useState<
    Set<string>
  >(new Set(prefillEmails));
  const [individualSearch, setIndividualSearch] = React.useState("");
  const [previewCount, setPreviewCount] = React.useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Build RecipientFilter
  const currentFilter: RecipientFilter = React.useMemo(() => {
    const f: RecipientFilter = {};
    if (mode === "everyone") {
      f.all = true;
    } else {
      if (mode === "groups" || mode === "mix") {
        f.groupIds = Array.from(selectedGroups);
      }
      if (mode === "segments" || mode === "mix") {
        f.smartSegments = Array.from(selectedSegments);
      }
      if (mode === "individuals" || mode === "mix") {
        f.individualContactKeys = Array.from(selectedIndividuals);
      }
    }
    return f;
  }, [mode, selectedGroups, selectedSegments, selectedIndividuals]);

  // Debounced preview
  React.useEffect(() => {
    const handle = setTimeout(async () => {
      const res = await resolveRecipients(currentFilter);
      if (res.success) {
        setPreviewCount(res.data?.length ?? 0);
      } else {
        setPreviewCount(null);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [currentFilter]);

  async function doCreate(send: boolean) {
    if (!subject.trim()) {
      toast.error(t("errors.required"));
      return;
    }
    if (!body.trim()) {
      toast.error(t("errors.required"));
      return;
    }
    setSubmitting(true);
    const createRes = await createBroadcast({
      subject: subject.trim(),
      body_html: body,
      locale,
      recipient_filter: currentFilter,
    });
    if (!createRes.success || !createRes.data) {
      setSubmitting(false);
      toast.error(createRes.error ?? "Failed");
      return;
    }
    const { id, total_recipients } = createRes.data;

    if (!send) {
      setSubmitting(false);
      toast.success(
        t("admin.broadcasts.sentToast", { count: total_recipients }),
      );
      router.push(`/admin/broadcasts/${id}`);
      return;
    }

    toast.loading(t("admin.broadcasts.sendingToast"), { id: "send-bcast" });
    const sendRes = await sendBroadcast(id);
    toast.dismiss("send-bcast");
    setSubmitting(false);
    if (sendRes.success) {
      toast.success(
        t("admin.broadcasts.sentToast", {
          count: sendRes.data?.delivered ?? 0,
        }),
      );
      router.push(`/admin/broadcasts/${id}`);
    } else {
      toast.error(sendRes.error ?? t("admin.broadcasts.failedToast"));
      router.push(`/admin/broadcasts/${id}`);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-mole">
          {t("admin.broadcasts.newBroadcast")}
        </h1>
        <p className="text-sm text-mole/60">{t("admin.broadcasts.subtitle")}</p>
      </div>

      {isTestMode ? (
        <div className="flex items-start gap-2 rounded-md border border-chile/30 bg-chile/5 p-3 text-sm text-mole">
          <AlertTriangle className="h-5 w-5 shrink-0 text-chile" />
          <div>
            {t("admin.broadcasts.testModeWarning", { cap: testModeCap })}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-mole/70 uppercase tracking-wide">
                {t("admin.broadcasts.subject")}
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("admin.broadcasts.subjectPlaceholder")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-mole/70 uppercase tracking-wide">
                {t("admin.broadcasts.language")}
              </label>
              <div className="flex gap-2 mt-1">
                {(["es", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLocale(l)}
                    className={`rounded px-3 py-1 text-xs font-medium border ${
                      locale === l
                        ? "bg-nopal text-papel border-nopal"
                        : "border-nopal/30 text-mole hover:bg-papel-warm"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-mole/70 uppercase tracking-wide">
                {t("admin.broadcasts.body")}
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("admin.broadcasts.bodyPlaceholder")}
                rows={14}
                className="font-mono text-xs"
              />
              <p className="text-xs text-mole/50 mt-1">
                {t("admin.broadcasts.bodyHint")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-mole/70 uppercase tracking-wide">
                {t("admin.broadcasts.recipients")}
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(
                  [
                    ["everyone", "admin.broadcasts.recipientsEveryone"],
                    ["groups", "admin.broadcasts.recipientsGroups"],
                    ["segments", "admin.broadcasts.recipientsSegments"],
                    [
                      "individuals",
                      "admin.broadcasts.recipientsIndividuals",
                    ],
                    ["mix", "admin.broadcasts.recipientsMix"],
                  ] as const
                ).map(([m, k]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      mode === m
                        ? "bg-nopal text-papel border-nopal"
                        : "border-nopal/30 text-mole hover:bg-papel-warm"
                    }`}
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            </div>

            {(mode === "groups" || mode === "mix") && groups.length > 0 ? (
              <div>
                <div className="text-xs font-semibold text-mole/70 uppercase tracking-wide mb-1">
                  {t("admin.broadcasts.recipientsGroups")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const on = selectedGroups.has(g.id);
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs cursor-pointer ${
                          on
                            ? "bg-nopal text-papel border-nopal"
                            : "border-nopal/30"
                        }`}
                      >
                        <Checkbox
                          checked={on}
                          onCheckedChange={() => {
                            setSelectedGroups((prev) => {
                              const n = new Set(prev);
                              if (n.has(g.id)) n.delete(g.id);
                              else n.add(g.id);
                              return n;
                            });
                          }}
                        />
                        {g.name} ({g.member_count})
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "segments" || mode === "mix" ? (
              <div>
                <div className="text-xs font-semibold text-mole/70 uppercase tracking-wide mb-1">
                  {t("admin.broadcasts.recipientsSegments")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["new", "admin.contacts.segmentNew"],
                      ["recurring", "admin.contacts.segmentRecurring"],
                      ["vip", "admin.contacts.segmentVIP"],
                      ["catering_prospect", "admin.contacts.segmentCatering"],
                      [
                        "marketing_opt_in",
                        "admin.contacts.filterMarketingOptIn",
                      ],
                    ] as const
                  ).map(([s, k]) => {
                    const on = selectedSegments.has(s);
                    return (
                      <label
                        key={s}
                        className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs cursor-pointer ${
                          on
                            ? "bg-nopal text-papel border-nopal"
                            : "border-nopal/30"
                        }`}
                      >
                        <Checkbox
                          checked={on}
                          onCheckedChange={() => {
                            setSelectedSegments((prev) => {
                              const n = new Set(prev);
                              if (n.has(s)) n.delete(s);
                              else n.add(s);
                              return n;
                            });
                          }}
                        />
                        {t(k)}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "individuals" || mode === "mix" ? (
              <div>
                <div className="text-xs font-semibold text-mole/70 uppercase tracking-wide mb-1">
                  {t("admin.broadcasts.recipientsIndividuals")} (
                  {selectedIndividuals.size})
                </div>
                <Input
                  placeholder={t("admin.contacts.searchPlaceholder")}
                  value={individualSearch}
                  onChange={(e) => setIndividualSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                  {contacts
                    .filter((c) => {
                      const n = individualSearch.trim().toLowerCase();
                      if (!n) return selectedIndividuals.has(c.email);
                      return (
                        c.email.toLowerCase().includes(n) ||
                        (c.name ?? "").toLowerCase().includes(n)
                      );
                    })
                    .slice(0, 50)
                    .map((c) => {
                      const on = selectedIndividuals.has(c.email);
                      return (
                        <label
                          key={c.key}
                          className="flex items-center gap-2 text-xs rounded px-2 py-1 hover:bg-papel-warm cursor-pointer"
                        >
                          <Checkbox
                            checked={on}
                            onCheckedChange={() => {
                              setSelectedIndividuals((prev) => {
                                const n = new Set(prev);
                                if (n.has(c.email)) n.delete(c.email);
                                else n.add(c.email);
                                return n;
                              });
                            }}
                          />
                          <span className="flex-1 truncate">
                            {c.name ?? c.email}
                          </span>
                          <span className="text-mole/50 truncate">
                            {c.email}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            ) : null}

            <div className="rounded-md bg-papel-warm p-3 text-sm flex items-center justify-between">
              <span className="font-semibold text-mole">
                {t("admin.broadcasts.previewCount", {
                  count: previewCount ?? 0,
                })}
              </span>
              {isTestMode && previewCount && previewCount > testModeCap ? (
                <span className="text-xs text-chile">
                  → max {testModeCap}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => doCreate(false)}
          disabled={submitting}
        >
          <Save className="h-4 w-4" />
          {t("admin.broadcasts.saveDraft")}
        </Button>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={submitting || !subject.trim() || !body.trim()}
        >
          <Send className="h-4 w-4" />
          {t("admin.broadcasts.sendNow")}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.broadcasts.confirmSendTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.broadcasts.confirmSendBody", {
                count: previewCount ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-mole/60">
              {t("admin.broadcasts.subject")}
            </div>
            <div className="text-sm text-mole font-medium">{subject}</div>
            <div className="text-xs text-mole/60">
              → Unsubscribe link added automatically.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                setConfirmOpen(false);
                await doCreate(true);
              }}
              disabled={submitting}
            >
              {t("admin.broadcasts.sendNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
