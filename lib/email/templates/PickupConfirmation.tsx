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
  getAppUrl,
  type Locale,
} from "./_shared";

export interface PickupConfirmationProps {
  locale: Locale;
  orderNumber: string;
  customerName: string;
  total: number;
  referralCode: string;
  reviewUrl: string;
  referralUrl: string;
}

const copy = {
  en: {
    preview: (n: string) => `Thanks for your order — #${n}`,
    eyebrow: (name: string) => `Thanks, ${name}!`,
    heading: "We hope every bite was worth it.",
    intro:
      "Your order is picked up, the balance is squared away, and we're already thinking about next Saturday. Two quick favors — if you have 30 seconds.",
    paidLabel: "Order paid in full",
    reviewHeading: "Leave us a quick review",
    reviewBody:
      "A short note about your experience helps more families find us. It genuinely means the world.",
    reviewCta: "Leave a review",
    referralHeading: "Share the carnitas love",
    referralBody: (code: string) =>
      `Share your code — friends get a warm welcome and you earn rewards on your next order.`,
    referralCodeLabel: "Your code",
    referralCta: "Share your link",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · Reply anytime. We read every message.",
  },
  es: {
    preview: (n: string) => `Gracias por tu pedido — #${n}`,
    eyebrow: (name: string) => `¡Gracias, ${name}!`,
    heading: "Esperamos que cada bocado haya valido la pena.",
    intro:
      "Ya recogiste tu pedido, todo quedó pagado, y nosotros ya estamos pensando en el próximo sábado. Dos favores rápidos — si tienes 30 segundos.",
    paidLabel: "Pedido pagado completo",
    reviewHeading: "Déjanos una reseña rapidita",
    reviewBody:
      "Unas líneas sobre tu experiencia ayudan a que más familias nos encuentren. De corazón te lo agradecemos.",
    reviewCta: "Dejar reseña",
    referralHeading: "Comparte las carnitas",
    referralBody: (code: string) =>
      `Comparte tu código — tus amigos reciben una bienvenida calientita y tú ganas recompensas en tu próximo pedido.`,
    referralCodeLabel: "Tu código",
    referralCta: "Compartir tu enlace",
    signoff: "— Don Nico",
    footer:
      "Carnitas Don Nico · Respóndenos cuando quieras. Leemos todos los mensajes.",
  },
} as const;

export default function PickupConfirmation(props: PickupConfirmationProps) {
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
            <Text style={styles.heroBadge}>¡Gracias!</Text>
          </Section>

          <Section style={styles.card}>
            <Text style={styles.eyebrow}>{t.eyebrow(props.customerName)}</Text>
            <Heading as="h1" style={styles.h1}>
              {t.heading}
            </Heading>
            <Text style={styles.p}>{t.intro}</Text>

            <Section style={styles.paidBox}>
              <Text style={styles.paidLabel}>{t.paidLabel}</Text>
              <Text style={styles.paidValue}>
                {formatCurrency(props.total, props.locale)}
              </Text>
            </Section>

            <Hr style={styles.hr} />

            {/* Review */}
            <Text style={styles.sectionLabel}>{t.reviewHeading}</Text>
            <Text style={styles.p}>{t.reviewBody}</Text>
            <Section style={styles.ctaWrap}>
              <Button href={props.reviewUrl} style={styles.ctaBtn}>
                {t.reviewCta}
              </Button>
            </Section>

            <Hr style={styles.hr} />

            {/* Referral */}
            <Text style={styles.sectionLabel}>{t.referralHeading}</Text>
            <Text style={styles.p}>{t.referralBody(props.referralCode)}</Text>
            <Section style={styles.codeBox}>
              <Text style={styles.codeLabel}>{t.referralCodeLabel}</Text>
              <Text style={styles.codeValue}>{props.referralCode}</Text>
            </Section>
            <Section style={styles.ctaWrap}>
              <Link href={props.referralUrl} style={styles.referralLink}>
                {t.referralCta} →
              </Link>
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
  heroBadge: {
    color: brand.oro,
    fontSize: "18px",
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
    fontSize: "14px",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    margin: "0 0 8px",
  },
  paidBox: {
    backgroundColor: "rgba(58,74,47,0.1)",
    padding: "12px 14px",
    borderRadius: "8px",
    margin: "12px 0",
  },
  paidLabel: {
    color: brand.nopal,
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    margin: "0",
  },
  paidValue: {
    color: brand.nopal,
    fontSize: "22px",
    fontWeight: 700,
    margin: "2px 0 0",
  },
  codeBox: {
    backgroundColor: brand.mole,
    color: brand.oro,
    padding: "14px",
    borderRadius: "8px",
    margin: "12px 0",
    textAlign: "center" as const,
  },
  codeLabel: {
    color: brand.oro,
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    margin: "0",
    opacity: 0.85,
  },
  codeValue: {
    color: brand.oro,
    fontSize: "26px",
    fontWeight: 700,
    letterSpacing: "3px",
    margin: "4px 0 0",
  },
  ctaWrap: {
    textAlign: "center" as const,
    margin: "12px 0 8px",
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
  referralLink: {
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
