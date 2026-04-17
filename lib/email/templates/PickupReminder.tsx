import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  brand,
  formatCurrency,
  formatPickupDate,
  formatTime,
  getAppUrl,
  type Locale,
} from "./_shared";

export interface PickupReminderProps {
  locale: Locale;
  orderNumber: string;
  customerName: string;
  pickupDate: string; // YYYY-MM-DD
  pickupWindowStart: string | null;
  pickupWindowEnd: string | null;
  balance: number;
  trackUrl: string;
  qrDataUrl: string;
  mapUrl: string;
}

const copy = {
  en: {
    preview: (n: string) =>
      `Tomorrow's pickup day — ${n}. See you then.`,
    hello: (name: string) => `Buen día, ${name}!`,
    heading: "Tomorrow is pickup day.",
    intro:
      "Quick reminder — your carnitas come out of the pot tomorrow morning and your name's on a tray. Here's everything you need.",
    pickupLabel: "Pickup tomorrow",
    window: "Window",
    balanceLabel: "Balance at pickup",
    balanceNone: "Paid in full — nothing to bring.",
    qrHeading: "Show this when you arrive",
    qrCaption: "Scan to pull up your order instantly.",
    mapCta: "Open map",
    ctaView: "View order",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · Need to change something? Just reply to this email.",
  },
  es: {
    preview: (n: string) => `Mañana recoges tu pedido — ${n}.`,
    hello: (name: string) => `¡Buen día, ${name}!`,
    heading: "Mañana recoges tu pedido.",
    intro:
      "Un recordatorio rápido — mañana temprano salen las carnitas de la olla y ya tenemos tu charola lista. Aquí va todo lo que necesitas.",
    pickupLabel: "Recoges mañana",
    window: "Horario",
    balanceLabel: "Por pagar al recoger",
    balanceNone: "Pagado completo — no tienes que traer nada.",
    qrHeading: "Muestra esto al llegar",
    qrCaption: "Escanea para abrir tu pedido al instante.",
    mapCta: "Abrir mapa",
    ctaView: "Ver pedido",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · ¿Necesitas cambiar algo? Solo responde este correo.",
  },
} as const;

export default function PickupReminder(props: PickupReminderProps) {
  const t = copy[props.locale] ?? copy.es;
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/brand/logo.png`;

  return (
    <Html>
      <Head />
      <Preview>{t.preview(props.orderNumber)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.hero}>
            <Img
              src={logoUrl}
              alt="Carnitas Don Nico"
              width="96"
              height="96"
              style={styles.logo}
            />
            <Text style={styles.heroOrderBadge}>#{props.orderNumber}</Text>
          </Section>

          <Section style={styles.card}>
            <Text style={styles.eyebrow}>{t.hello(props.customerName)}</Text>
            <Heading as="h1" style={styles.h1}>
              {t.heading}
            </Heading>
            <Text style={styles.p}>{t.intro}</Text>

            <Hr style={styles.hr} />

            <Text style={styles.sectionLabel}>{t.pickupLabel}</Text>
            <Text style={styles.pickupDate}>
              {formatPickupDate(props.pickupDate, props.locale)}
            </Text>
            {props.pickupWindowStart && props.pickupWindowEnd ? (
              <Text style={styles.pickupWindow}>
                {t.window}:{" "}
                {formatTime(props.pickupWindowStart, props.locale)} –{" "}
                {formatTime(props.pickupWindowEnd, props.locale)}
              </Text>
            ) : null}

            <Section style={styles.balanceBox}>
              {props.balance > 0 ? (
                <>
                  <Text style={styles.balanceLabel}>{t.balanceLabel}</Text>
                  <Text style={styles.balanceValue}>
                    {formatCurrency(props.balance, props.locale)}
                  </Text>
                </>
              ) : (
                <Text style={styles.balanceLabel}>{t.balanceNone}</Text>
              )}
            </Section>

            <Hr style={styles.hr} />

            <Section style={styles.qrBlock}>
              <Text style={styles.qrHeading}>{t.qrHeading}</Text>
              <Img
                src={props.qrDataUrl}
                alt="Order QR"
                width="160"
                height="160"
                style={styles.qr}
              />
              <Text style={styles.qrCaption}>{t.qrCaption}</Text>
            </Section>

            <Section style={styles.ctaWrap}>
              <Button href={props.trackUrl} style={styles.ctaBtn}>
                {t.ctaView}
              </Button>
              <Text style={styles.mapWrap}>
                <Link href={props.mapUrl} style={styles.mapLink}>
                  {t.mapCta} →
                </Link>
              </Text>
            </Section>

            <Text style={styles.signoff}>{t.signoff}</Text>
          </Section>

          <Text style={styles.footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: brand.papel,
    fontFamily: "Georgia, 'Times New Roman', serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: "640px",
    margin: "0 auto",
    padding: "24px 16px",
  },
  hero: {
    backgroundColor: brand.nopal,
    borderRadius: "12px 12px 0 0",
    padding: "28px 24px",
    textAlign: "center" as const,
  },
  logo: {
    display: "block",
    margin: "0 auto 10px",
    borderRadius: "50%",
  },
  heroOrderBadge: {
    color: brand.oro,
    fontSize: "14px",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "8px 0 0",
    fontWeight: 700,
  },
  card: {
    backgroundColor: brand.papel,
    border: `1px solid ${brand.paperDark}`,
    borderRadius: "0 0 12px 12px",
    padding: "28px 24px",
  },
  eyebrow: {
    color: brand.oro,
    fontSize: "13px",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    margin: "0 0 6px",
    fontWeight: 700,
  },
  h1: {
    color: brand.mole,
    fontSize: "26px",
    lineHeight: "1.25",
    margin: "0 0 12px",
  },
  p: {
    color: brand.mole,
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 12px",
  },
  hr: {
    borderColor: brand.paperDark,
    margin: "20px 0",
  },
  sectionLabel: {
    color: brand.nopal,
    fontSize: "12px",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    margin: "0 0 6px",
  },
  pickupDate: {
    color: brand.mole,
    fontSize: "20px",
    fontWeight: 700,
    margin: "0 0 4px",
  },
  pickupWindow: {
    color: brand.textMuted,
    fontSize: "14px",
    margin: "0 0 8px",
  },
  balanceBox: {
    backgroundColor: "rgba(200,160,74,0.15)",
    padding: "12px 14px",
    borderRadius: "8px",
    margin: "12px 0 0",
  },
  balanceLabel: {
    color: brand.nopal,
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    margin: "0",
  },
  balanceValue: {
    color: brand.nopal,
    fontSize: "22px",
    fontWeight: 700,
    margin: "2px 0 0",
  },
  qrBlock: {
    textAlign: "center" as const,
    padding: "8px 0",
  },
  qrHeading: {
    color: brand.nopal,
    fontSize: "12px",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    margin: "0 0 10px",
  },
  qr: {
    display: "block",
    margin: "0 auto",
    border: `6px solid ${brand.papel}`,
    backgroundColor: brand.papel,
  },
  qrCaption: {
    color: brand.textMuted,
    fontSize: "13px",
    margin: "8px 0 0",
  },
  ctaWrap: {
    textAlign: "center" as const,
    margin: "16px 0 8px",
  },
  ctaBtn: {
    backgroundColor: brand.nopal,
    color: brand.papel,
    fontSize: "15px",
    fontWeight: 700,
    padding: "12px 24px",
    borderRadius: "999px",
    textDecoration: "none",
    display: "inline-block",
  },
  mapWrap: {
    margin: "12px 0 0",
  },
  mapLink: {
    color: brand.nopal,
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "underline",
  },
  signoff: {
    color: brand.mole,
    fontSize: "16px",
    fontStyle: "italic" as const,
    marginTop: "16px",
  },
  footer: {
    color: brand.textMuted,
    fontSize: "12px",
    textAlign: "center" as const,
    marginTop: "20px",
    padding: "0 12px",
  },
};
