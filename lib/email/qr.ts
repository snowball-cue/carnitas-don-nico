import "server-only";

import QRCode from "qrcode";

/**
 * Generate a PNG data URL for a QR code, suitable for embedding directly in
 * an email <Img src={...}>. Uses brand-matching dark mole on papel cream.
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#1F2818", // mole
      light: "#F5EFE0", // papel
    },
  });
}
