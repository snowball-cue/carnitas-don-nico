"use client";

import * as React from "react";

/**
 * Renders `children` only in browsers that support WebAuthn.
 * Falls back to `fallback` (or nothing) otherwise.
 */
export function WebAuthnSupportedGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [supported, setSupported] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      setSupported(false);
      return;
    }
    const ok =
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === "function";
    setSupported(ok);
  }, []);

  if (supported === null) return null; // avoid layout flash during hydration
  if (!supported) return <>{fallback}</>;
  return <>{children}</>;
}

export default WebAuthnSupportedGuard;
