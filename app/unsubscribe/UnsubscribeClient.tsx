"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { unsubscribeEmail } from "@/app/actions/admin/marketing";

type State = "idle" | "submitting" | "done" | "error";

const REPLY_TO = "carnitasdonnico25@gmail.com";

export function UnsubscribeClient({ email }: { email: string | null }) {
  const { t } = useTranslation();
  const [state, setState] = React.useState<State>("idle");

  async function onConfirm() {
    if (!email) return;
    setState("submitting");
    const res = await unsubscribeEmail(email);
    setState(res.success ? "done" : "error");
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-papel flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 space-y-3 text-center">
            <h1 className="font-display text-2xl text-mole">
              {t("unsubscribe.invalidTitle")}
            </h1>
            <p className="text-sm text-mole/70">
              {t("unsubscribe.invalidBody", { email: REPLY_TO })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-papel flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-4 text-center">
          {state === "done" ? (
            <>
              <h1 className="font-display text-2xl text-mole">
                {t("unsubscribe.successTitle")}
              </h1>
              <p className="text-sm text-mole/70">
                {t("unsubscribe.successBody")}
              </p>
            </>
          ) : state === "error" ? (
            <>
              <h1 className="font-display text-2xl text-mole">
                {t("unsubscribe.errorTitle")}
              </h1>
              <p className="text-sm text-mole/70">
                {t("unsubscribe.errorBody")}
              </p>
              <Button onClick={onConfirm}>{t("common.retry")}</Button>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl text-mole">
                {t("unsubscribe.title")}
              </h1>
              <p className="text-sm text-mole">
                {t("unsubscribe.question", { email })}
              </p>
              <p className="text-xs text-mole/60">{t("unsubscribe.body")}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  disabled={state === "submitting"}
                >
                  {t("unsubscribe.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={onConfirm}
                  disabled={state === "submitting"}
                >
                  {t("unsubscribe.confirm")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
