"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  orderNumber: string;
  trackUrl: string;
}

export function ConfirmationActions({ orderNumber, trackUrl }: Props) {
  const { t } = useTranslation();

  const onShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `Carnitas Don Nico · ${orderNumber}`,
          text: `My order ${orderNumber}`,
          url: trackUrl,
        });
      } else {
        await navigator.clipboard.writeText(trackUrl);
        toast.success(t("confirmation.linkCopied", "Link copied"));
      }
    } catch {
      // user cancel or no permission
    }
  };

  const onWallet = () => {
    // TODO: Wire Apple Wallet / Google Wallet pass generation
    toast(
      t(
        "confirmation.walletComingSoon",
        "Add to Wallet coming soon"
      )
    );
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="rounded-lg border border-nopal/10 bg-papel p-4">
        <QRCodeSVG
          value={trackUrl}
          size={180}
          bgColor="#F5EFE0"
          fgColor="#2C1A12"
          level="M"
        />
      </div>
      <p className="text-xs text-mole/60 text-center max-w-xs">
        {t(
          "confirmation.qrHint",
          "Scan this QR code to track your order"
        )}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={onWallet}>
          <Wallet className="h-4 w-4" />
          {t("confirmation.addToWallet", "Add to Wallet")}
        </Button>
        <Button variant="outline" onClick={onShare}>
          <Share2 className="h-4 w-4" />
          {t("confirmation.share", "Share")}
        </Button>
      </div>
    </div>
  );
}
