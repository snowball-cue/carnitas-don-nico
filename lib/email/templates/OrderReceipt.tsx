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

export interface OrderReceiptItem {
  name: string;
  variant?: string | null;
  quantity: number;
  unit: "lb" | "each";
  lineTotal: number;
}

export interface OrderReceiptProps {
  locale: Locale;
  orderNumber: string;
  customerName: string;
  items: OrderReceiptItem[];
  subtotal: number;
  tip: number;
  total: number;
  depositPaid: number;
  balance: number;
  pickupDate: string; // YYYY-MM-DD
  pickupWindowStart: string | null;
  pickupWindowEnd: string | null;
  trackUrl: string;
  qrDataUrl: string;
}

const copy = {
  en: {
    preview: (n: string) => `Order ${n} confirmed — we're cooking your pounds.`,
    hello: (name: string) => `Thanks, ${name}!`,
    heading: "Your order is confirmed.",
    intro:
      "We're so glad you're eating with us this Saturday. Don Nico is already prepping the pork — here's your receipt so you know what's coming.",
    orderLabel: "Order",
    pickupLabel: "Pickup",
    window: "Window",
    itemsHeading: "What you ordered",
    subtotal: "Subtotal",
    tip: "Tip for the team",
    total: "Total",
    depositPaid: "Paid today",
    balance: "Balance at pickup",
    qrHeading: "Show this at pickup",
    qrCaption: "Scan to pull up your order instantly.",
    ctaView: "View order",
    pickupNoteTitle: "Pickup instructions",
    pickupNote:
      "Pull up to the house, stay in your car, and we'll bring your order out warm. Please arrive inside your window so the carnitas don't go cold waiting on you.",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · Reply to this email if anything's off and we'll make it right.",
    unit: { lb: "lb", each: "" },
  },
  es: {
    preview: (n: string) =>
      `Pedido ${n} confirmado — ya estamos cocinando tus libras.`,
    hello: (name: string) => `¡Gracias, ${name}!`,
    heading: "Tu pedido está confirmado.",
    intro:
      "Nos da mucho gusto que este sábado comas con nosotros. Don Nico ya tiene el puerco en la lumbre — aquí va tu recibo para que sepas qué esperar.",
    orderLabel: "Pedido",
    pickupLabel: "Recoger",
    window: "Horario",
    itemsHeading: "Lo que pediste",
    subtotal: "Subtotal",
    tip: "Propina para el equipo",
    total: "Total",
    depositPaid: "Pagado hoy",
    balance: "Por pagar al recoger",
    qrHeading: "Muestra esto al recoger",
    qrCaption: "Escanea para abrir tu pedido al instante.",
    ctaView: "Ver pedido",
    pickupNoteTitle: "Instrucciones para recoger",
    pickupNote:
      "Llega a la casa, quédate en tu carro y te llevamos tu pedido calientito. Por favor llega dentro de tu horario para que las carnitas no se enfríen esperándote.",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · Si algo no está bien, responde este correo y lo arreglamos.",
    unit: { lb: "lb", each: "" },
  },
} as const;

export default function OrderReceipt(props: OrderReceiptProps) {
  const t = copy[props.locale] ?? copy.es;
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/brand/logo.png`;

  return (
    <Html>
      <Head />
      <Preview>{t.preview(props.orderNumber)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Hero band */}
          <Section style={styles.hero}>
            <Img
              src={logoUrl}
              alt="Carnitas Don Nico"
              width="96"
              height="96"
              style={styles.logo}
            />
            <Text style={styles.heroOrderBadge}>
              {t.orderLabel} #{props.orderNumber}
            </Text>
          </Section>

          {/* Body */}
          <Section style={styles.card}>
            <Text style={styles.eyebrow}>{t.hello(props.customerName)}</Text>
            <Heading as="h1" style={styles.h1}>
              {t.heading}
            </Heading>
            <Text style={styles.p}>{t.intro}</Text>

            <Hr style={styles.hr} />

            {/* Pickup */}
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
            <Text style={styles.pickupAddress}>
              📍{" "}
              {process.env.NEXT_PUBLIC_PICKUP_ADDRESS ||
                "379 Nottingham Loop, Kyle, TX 78640"}
            </Text>

            <Hr style={styles.hr} />

            {/* Items */}
            <Text style={styles.sectionLabel}>{t.itemsHeading}</Text>
            {props.items.map((it, i) => (
              <Section key={i} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {it.quantity} {it.unit === "lb" ? t.unit.lb : ""}
                  {" · "}
                  {it.name}
                  {it.variant ? ` (${it.variant})` : ""}
                </Text>
                <Text style={styles.itemTotal}>
                  {formatCurrency(it.lineTotal, props.locale)}
                </Text>
              </Section>
            ))}

            <Hr style={styles.hr} />

            {/* Totals */}
            <Section style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{t.subtotal}</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(props.subtotal, props.locale)}
              </Text>
            </Section>
            {props.tip > 0 ? (
              <Section style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{t.tip}</Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(props.tip, props.locale)}
                </Text>
              </Section>
            ) : null}
            <Section style={styles.totalsRowBold}>
              <Text style={styles.totalsLabelBold}>{t.total}</Text>
              <Text style={styles.totalsValueBold}>
                {formatCurrency(props.total, props.locale)}
              </Text>
            </Section>
            {props.depositPaid > 0 ? (
              <Section style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{t.depositPaid}</Text>
                <Text style={styles.totalsValue}>
                  {formatCurrency(props.depositPaid, props.locale)}
                </Text>
              </Section>
            ) : null}
            <Section style={styles.totalsRowAccent}>
              <Text style={styles.totalsLabelAccent}>{t.balance}</Text>
              <Text style={styles.totalsValueAccent}>
                {formatCurrency(props.balance, props.locale)}
              </Text>
            </Section>

            <Hr style={styles.hr} />

            {/* QR */}
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

            {/* CTA */}
            <Section style={styles.ctaWrap}>
              <Button href={props.trackUrl} style={styles.ctaBtn}>
                {t.ctaView}
              </Button>
            </Section>

            <Hr style={styles.hr} />

            {/* Pickup note */}
            <Text style={styles.sectionLabel}>{t.pickupNoteTitle}</Text>
            <Text style={styles.p}>{t.pickupNote}</Text>

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
    fontFamily:
      "Georgia, 'Times New Roman', serif",
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
    margin: "0",
  },
  pickupAddress: {
    color: brand.mole,
    fontSize: "14px",
    fontWeight: 600,
    margin: "6px 0 0",
  },
  itemRow: {
    display: "table",
    width: "100%",
    margin: "6px 0",
  },
  itemName: {
    color: brand.mole,
    fontSize: "14px",
    margin: 0,
    display: "table-cell",
  },
  itemTotal: {
    color: brand.mole,
    fontSize: "14px",
    fontWeight: 600,
    margin: 0,
    display: "table-cell",
    textAlign: "right" as const,
    whiteSpace: "nowrap" as const,
  },
  totalsRow: {
    display: "table",
    width: "100%",
    margin: "4px 0",
  },
  totalsLabel: {
    color: brand.textMuted,
    fontSize: "14px",
    margin: 0,
    display: "table-cell",
  },
  totalsValue: {
    color: brand.mole,
    fontSize: "14px",
    margin: 0,
    display: "table-cell",
    textAlign: "right" as const,
  },
  totalsRowBold: {
    display: "table",
    width: "100%",
    margin: "10px 0 4px",
    paddingTop: "6px",
    borderTop: `1px solid ${brand.paperDark}`,
  },
  totalsLabelBold: {
    color: brand.mole,
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    display: "table-cell",
  },
  totalsValueBold: {
    color: brand.mole,
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    display: "table-cell",
    textAlign: "right" as const,
  },
  totalsRowAccent: {
    display: "table",
    width: "100%",
    margin: "10px 0 0",
    padding: "10px 12px",
    backgroundColor: "rgba(200,160,74,0.15)",
    borderRadius: "8px",
  },
  totalsLabelAccent: {
    color: brand.nopal,
    fontSize: "14px",
    fontWeight: 700,
    margin: 0,
    display: "table-cell",
  },
  totalsValueAccent: {
    color: brand.nopal,
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    display: "table-cell",
    textAlign: "right" as const,
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
