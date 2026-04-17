import { TrackClient } from "./TrackClient";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ phone?: string }>;
}

export default async function TrackPage({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-mole mb-2">
        Track your order
      </h1>
      <p className="text-mole/70 mb-6">
        Order <span className="font-mono font-semibold">{orderNumber}</span>
      </p>
      <TrackClient orderNumber={orderNumber} initialPhone={sp.phone ?? ""} />
    </div>
  );
}
