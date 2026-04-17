import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { brand, getAppUrl, type Locale } from "./_shared";

export interface MarketingBroadcastProps {
  locale: Locale;
  subject: string;
  firstName: string;
  /** Sanitized HTML body (already cleaned via sanitizeMarketingHtml). */
  bodyHtml: string;
  unsubscribeUrl: string;
  replyTo: string;
  businessAddress?: string;
}

const copy = {
  en: {
    greeting: (name: string) =>
      name && name !== "there" ? `Hi ${name},` : "Hello,",
    unsubscribe: "Unsubscribe",
    unsubscribeBlurb:
      "You're getting this because you ordered from Carnitas Don Nico.",
    reply: "Reply to this email any time — we read every message.",
    addressDefault: "Kyle, TX 78640",
  },
  es: {
    greeting: (name: string) =>
      name && name !== "there" ? `Hola ${name},` : "Hola,",
    unsubscribe: "Darse de baja",
    unsubscribeBlurb:
      "Recibes esto porque pediste carnitas con Don Nico.",
    reply: "Responde a este correo cuando quieras — leemos todos los mensajes.",
    addressDefault: "Kyle, TX 78640",
  },
} as const;

export default function MarketingBroadcast(props: MarketingBroadcastProps) {
  const t = copy[props.locale] ?? copy.es;
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/brand/logo.png`;
  const address = props.businessAddress ?? t.addressDefault;

  return (
    <Html>
      <Head />
      <Preview>{props.subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.hero}>
            <Img
              src={logoUrl}
              alt="Carnitas Don Nico"
              width="80"
              height="80"
              style={styles.logo}
            />
            <Text style={styles.heroBadge}>Carnitas Don Nico</Text>
          </Section>

          <Section style={styles.card}>
            <Text style={styles.greeting}>{t.greeting(props.firstName)}</Text>

            {/* Sanitized HTML body — see sanitizeMarketingHtml in marketing action */}
            <div
              style={styles.bodyText}
              dangerouslySetInnerHTML={{ __html: props.bodyHtml }}
            />

            <Text style={styles.signoff}>— Don Nico</Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerLine}>{t.reply}</Text>
            <Text style={styles.footerSmall}>
              Carnitas Don Nico · {address}
              <br />
              <Link href={`mailto:${props.replyTo}`} style={styles.footerLink}>
                {props.replyTo}
              </Link>
            </Text>
            <Text style={styles.footerSmall}>{t.unsubscribeBlurb}</Text>
            <Text style={styles.footerSmall}>
              <Link href={props.unsubscribeUrl} style={styles.unsubLink}>
                {t.unsubscribe}
              </Link>
            </Text>
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
  container: {
    maxWidth: "640px",
    margin: "0 auto",
    padding: "24px 16px",
  },
  hero: {
    backgroundColor: brand.nopal,
    borderRadius: "12px 12px 0 0",
    padding: "24px 20px",
    textAlign: "center" as const,
  },
  logo: {
    display: "block",
    margin: "0 auto 8px",
    borderRadius: "50%",
  },
  heroBadge: {
    color: brand.oro,
    fontSize: "13px",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "6px 0 0",
    fontWeight: 700,
  },
  card: {
    backgroundColor: brand.papel,
    border: `1px solid ${brand.paperDark}`,
    borderRadius: "0 0 12px 12px",
    padding: "28px 24px",
  },
  greeting: {
    color: brand.mole,
    fontSize: "17px",
    margin: "0 0 16px",
    fontWeight: 600,
  },
  bodyText: {
    color: brand.mole,
    fontSize: "15px",
    lineHeight: "1.6",
  },
  signoff: {
    color: brand.mole,
    fontSize: "16px",
    fontStyle: "italic" as const,
    marginTop: "24px",
  },
  footer: {
    textAlign: "center" as const,
    marginTop: "16px",
    padding: "0 12px",
  },
  footerLine: {
    color: brand.textMuted,
    fontSize: "12px",
    margin: "0 0 8px",
  },
  footerSmall: {
    color: brand.textMuted,
    fontSize: "11px",
    margin: "4px 0",
    lineHeight: "1.5",
  },
  footerLink: {
    color: brand.nopal,
    textDecoration: "underline",
  },
  unsubLink: {
    color: brand.textMuted,
    textDecoration: "underline",
  },
};
