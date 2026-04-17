import { decodeToken } from "@/lib/unsubscribe";
import { UnsubscribeClient } from "./UnsubscribeClient";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const payload = token ? decodeToken(token) : null;

  return <UnsubscribeClient email={payload?.email ?? null} />;
}
