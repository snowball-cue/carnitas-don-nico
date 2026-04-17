import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { brand } from "./_shared";

export interface CateringRequestOwnerProps {
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  eventDate: string;
  eventTimeSlot?: "12:00" | "16:00";
  guestCount: number;
  estimatedLbs: number;
  eventType: string | null;
  eventLocation: string | null;
  cutsPreference: string | null;
  includesSides: boolean;
  deliveryNeeded: boolean;
  notes: string | null;
  adminUrl: string;
}

export default function CateringRequestOwner(props: CateringRequestOwnerProps) {
  const preview = `New catering request — ${props.guestCount} guests · ${props.eventDate}`;

  const row = (label: string, value: string) => (
    <Section style={styles.itemRow}>
      <Text style={styles.itemName}>{label}</Text>
      <Text style={styles.itemTotal}>{value}</Text>
    </Section>
  );

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.hero}>
            <Text style={styles.heroEyebrow}>NEW CATERING REQUEST</Text>
            <Text style={styles.heroBadge}>{props.reference}</Text>
          </Section>

          <Section style={styles.card}>
            <Heading as="h1" style={styles.h1}>
              {props.guestCount} guests · {props.estimatedLbs} lb
            </Heading>
            <Text style={styles.p}>Event date: {props.eventDate}</Text>

            <Hr style={styles.hr} />

            <Text style={styles.sectionLabel}>Contact</Text>
            {row("Name", props.fullName)}
            {row("Email", props.email)}
            {row("Phone", props.phone)}

            <Hr style={styles.hr} />

            <Text style={styles.sectionLabel}>Event</Text>
            {row("Date", props.eventDate)}
            {props.eventTimeSlot
              ? row("Time", props.eventTimeSlot === "12:00" ? "12:00 PM" : "4:00 PM")
              : null}
            {row("Guests", String(props.guestCount))}
            {row("Estimated lbs", `${props.estimatedLbs} lb`)}
            {props.eventType ? row("Event type", props.eventType) : null}
            {props.eventLocation ? row("Location", props.eventLocation) : null}
            {props.cutsPreference
              ? row("Cuts preference", props.cutsPreference)
              : null}
            {row("Sides included", props.includesSides ? "Yes" : "No")}
            {row("Delivery needed", props.deliveryNeeded ? "Yes" : "No")}

            {props.notes ? (
              <>
                <Hr style={styles.hr} />
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text style={styles.p}>{props.notes}</Text>
              </>
            ) : null}

            <Hr style={styles.hr} />

            <Section style={styles.ctaWrap}>
              <Button href={props.adminUrl} style={styles.ctaBtn}>
                Open in admin
              </Button>
            </Section>
          </Section>
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
  container: { maxWidth: "640px", margin: "0 auto", padding: "24px 16px" },
  hero: {
    backgroundColor: brand.nopal,
    borderRadius: "12px 12px 0 0",
    padding: "20px 24px",
    textAlign: "center" as const,
  },
  heroEyebrow: {
    color: brand.papel,
    fontSize: "11px",
    letterSpacing: "2px",
    margin: 0,
    fontWeight: 700,
  },
  heroBadge: {
    color: brand.oro,
    fontSize: "18px",
    letterSpacing: "2px",
    margin: "6px 0 0",
    fontWeight: 700,
    fontFamily: "'Courier New', monospace",
  },
  card: {
    backgroundColor: brand.papel,
    border: `1px solid ${brand.paperDark}`,
    borderRadius: "0 0 12px 12px",
    padding: "24px",
  },
  h1: {
    color: brand.mole,
    fontSize: "22px",
    lineHeight: "1.25",
    margin: "0 0 4px",
  },
  p: {
    color: brand.mole,
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 6px",
  },
  hr: { borderColor: brand.paperDark, margin: "16px 0" },
  sectionLabel: {
    color: brand.nopal,
    fontSize: "11px",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    margin: "0 0 6px",
  },
  itemRow: { display: "table", width: "100%", margin: "4px 0" },
  itemName: {
    color: brand.textMuted,
    fontSize: "13px",
    margin: 0,
    display: "table-cell",
  },
  itemTotal: {
    color: brand.mole,
    fontSize: "13px",
    fontWeight: 600,
    margin: 0,
    display: "table-cell",
    textAlign: "right" as const,
  },
  ctaWrap: { textAlign: "center" as const, margin: "8px 0" },
  ctaBtn: {
    backgroundColor: brand.nopal,
    color: brand.papel,
    fontSize: "14px",
    fontWeight: 700,
    padding: "12px 24px",
    borderRadius: "999px",
    textDecoration: "none",
    display: "inline-block",
  },
};
