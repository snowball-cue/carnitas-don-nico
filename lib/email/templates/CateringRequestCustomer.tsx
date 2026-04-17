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
import { brand, formatPickupDate, formatTime, getAppUrl, type Locale } from "./_shared";

export interface CateringRequestCustomerProps {
  locale: Locale;
  reference: string;
  customerName: string;
  eventDate: string; // YYYY-MM-DD
  eventTimeSlot?: "12:00" | "16:00" | null;
  guestCount: number;
  estimatedLbs: number;
  eventType: string | null;
  includesSides: boolean;
  deliveryNeeded: boolean;
  /** Link to download the .ics calendar file (triggers the attachment route). */
  calendarLink?: string;
}

const copy = {
  en: {
    preview: (r: string) => `We got your catering request — ${r}`,
    eyebrow: (n: string) => `Thanks, ${n}!`,
    heading: "We got your catering request.",
    intro:
      "Don Nico will personally text or email you within 24 hours to plan the details, confirm pricing, and lock in your date. Big events take a little coordination — we want to get it right.",
    refLabel: "Your reference",
    whenLabel: "When",
    timeTBD: "Time to be confirmed",
    detailsLabel: "What you asked for",
    date: "Event date",
    guests: "Guests",
    lbs: "Estimated pounds",
    type: "Event type",
    sides: "Sides included",
    delivery: "Delivery",
    yes: "Yes",
    no: "No",
    whatsNextLabel: "What happens next",
    whatsNext:
      "1. Don Nico reviews your request. 2. You'll get a call, text, or email to go over cuts, pricing, and logistics. 3. Once confirmed, we'll send a final quote and save your date.",
    addToCalendar: "Add to calendar",
    addToCalendarHint: "Includes reminders 7 days and 24 hours before.",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · Reply to this email anytime — we read every message.",
  },
  es: {
    preview: (r: string) =>
      `Recibimos tu solicitud de catering — ${r}`,
    eyebrow: (n: string) => `¡Gracias, ${n}!`,
    heading: "Recibimos tu solicitud de catering.",
    intro:
      "Don Nico te va a llamar, enviar mensaje o correo personalmente en menos de 24 horas para planear los detalles, confirmar el precio y apartar tu fecha. Los eventos grandes necesitan un poquito de coordinación — queremos que todo salga perfecto.",
    refLabel: "Tu referencia",
    whenLabel: "Cuándo",
    timeTBD: "Horario por confirmar",
    detailsLabel: "Lo que pediste",
    date: "Fecha del evento",
    guests: "Invitados",
    lbs: "Libras estimadas",
    type: "Tipo de evento",
    sides: "Incluye acompañamientos",
    delivery: "Entrega a domicilio",
    yes: "Sí",
    no: "No",
    whatsNextLabel: "Qué sigue",
    whatsNext:
      "1. Don Nico revisa tu solicitud. 2. Te contactamos por llamada, mensaje o correo para ver cortes, precio y logística. 3. Una vez confirmado, te mandamos la cotización final y apartamos tu fecha.",
    addToCalendar: "Agregar al calendario",
    addToCalendarHint: "Incluye recordatorios 7 días y 24 horas antes.",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · Responde este correo cuando quieras — leemos todos los mensajes.",
  },
} as const;

export default function CateringRequestCustomer(
  props: CateringRequestCustomerProps,
) {
  const t = copy[props.locale] ?? copy.es;
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/brand/logo.png`;

  const row = (label: string, value: string) => (
    <Section style={styles.itemRow}>
      <Text style={styles.itemName}>{label}</Text>
      <Text style={styles.itemTotal}>{value}</Text>
    </Section>
  );

  return (
    <Html>
      <Head />
      <Preview>{t.preview(props.reference)}</Preview>
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
            <Text style={styles.heroBadge}>{props.reference}</Text>
          </Section>

          <Section style={styles.card}>
            <Text style={styles.eyebrow}>{t.eyebrow(props.customerName)}</Text>
            <Heading as="h1" style={styles.h1}>
              {t.heading}
            </Heading>
            <Text style={styles.p}>{t.intro}</Text>

            <Hr style={styles.hr} />

            <Text style={styles.sectionLabel}>{t.refLabel}</Text>
            <Text style={styles.refValue}>{props.reference}</Text>

            <Hr style={styles.hr} />

            <Text style={styles.sectionLabel}>{t.whenLabel}</Text>
            <Text style={styles.whenPrimary}>
              {formatPickupDate(props.eventDate, props.locale)}
            </Text>
            <Text style={styles.whenSecondary}>
              {props.eventTimeSlot
                ? formatTime(`${props.eventTimeSlot}:00`, props.locale)
                : t.timeTBD}
            </Text>

            {props.calendarLink ? (
              <Section style={styles.ctaWrap}>
                <Button href={props.calendarLink} style={styles.ctaBtn}>
                  {t.addToCalendar}
                </Button>
                <Text style={styles.ctaHint}>{t.addToCalendarHint}</Text>
              </Section>
            ) : null}

            <Hr style={styles.hr} />

            <Text style={styles.sectionLabel}>{t.detailsLabel}</Text>
            {row(t.date, props.eventDate)}
            {row(t.guests, String(props.guestCount))}
            {row(t.lbs, `${props.estimatedLbs} lb`)}
            {props.eventType ? row(t.type, props.eventType) : null}
            {row(t.sides, props.includesSides ? t.yes : t.no)}
            {row(t.delivery, props.deliveryNeeded ? t.yes : t.no)}

            <Hr style={styles.hr} />

            <Text style={styles.sectionLabel}>{t.whatsNextLabel}</Text>
            <Text style={styles.p}>{t.whatsNext}</Text>

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
  heroBadge: {
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
  hr: { borderColor: brand.paperDark, margin: "20px 0" },
  sectionLabel: {
    color: brand.nopal,
    fontSize: "12px",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    margin: "0 0 6px",
  },
  refValue: {
    color: brand.mole,
    fontSize: "20px",
    fontWeight: 700,
    fontFamily: "'Courier New', monospace",
    margin: 0,
  },
  itemRow: { display: "table", width: "100%", margin: "6px 0" },
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
  whenPrimary: {
    color: brand.mole,
    fontSize: "18px",
    fontWeight: 700,
    margin: "0 0 2px",
  },
  whenSecondary: {
    color: brand.mole,
    fontSize: "15px",
    margin: 0,
  },
  ctaWrap: {
    textAlign: "center" as const,
    margin: "16px 0 4px",
  },
  ctaBtn: {
    backgroundColor: brand.nopal,
    color: brand.papel,
    padding: "12px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    textDecoration: "none",
    display: "inline-block",
  },
  ctaHint: {
    color: brand.textMuted,
    fontSize: "12px",
    margin: "8px 0 0",
    textAlign: "center" as const,
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
