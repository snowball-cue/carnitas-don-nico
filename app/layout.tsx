import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Caveat } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  variable: "--font-script",
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Carnitas Don Nico — Carnitas al estilo Michoacán",
    template: "%s · Carnitas Don Nico",
  },
  description:
    "Carnitas cocidas a fuego lento al estilo Michoacán. Pre-ordena por libra. Listas el sábado.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
    shortcut: "/brand/logo.png",
  },
  openGraph: {
    title: "Carnitas Don Nico — Carnitas al estilo Michoacán",
    description:
      "Pre-ordena carnitas por libra. Recoge el sábado. Receta de tres generaciones.",
    url: APP_URL,
    siteName: "Carnitas Don Nico",
    images: [{ url: "/brand/logo.png", width: 512, height: 512 }],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Carnitas Don Nico",
    description: "Carnitas al estilo Michoacán — pre-ordena por libra.",
    images: ["/brand/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#3A4A2F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${caveat.variable}`}
    >
      <body className="bg-papel text-mole font-sans antialiased min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileNav />
          <Toaster
            position="top-center"
            closeButton
            richColors
            toastOptions={{
              classNames: {
                toast: "font-sans",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
