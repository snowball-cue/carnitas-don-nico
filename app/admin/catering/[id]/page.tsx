import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Mail, Phone } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CateringRequestRow } from "@/types/database";
import { CateringDetailActions } from "./CateringDetailActions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function refFromId(id: string): string {
  return `CAT-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export default async function AdminCateringDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("catering_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return notFound();
  const req = data as CateringRequestRow;
  const reference = refFromId(req.id);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/catering"
        className="inline-flex items-center gap-1 text-sm text-nopal hover:underline"
      >
        <ArrowLeft className="h-3 w-3" /> Catering
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-mole font-mono">
            {reference}
          </h1>
          <p className="text-sm text-mole/70">
            Submitted {format(new Date(req.created_at), "PPp")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/catering/${req.id}/ics`}
            className="inline-flex items-center gap-1.5 rounded-md border border-nopal/30 bg-nopal/5 px-3 py-1.5 text-sm font-medium text-nopal hover:bg-nopal/10"
            download={`CarnitasDonNico-${reference}.ics`}
          >
            <Calendar className="h-4 w-4" />
            Download .ics
          </a>
          <Badge variant="oro">{req.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Field
                label="Event date"
                value={format(new Date(`${req.event_date}T12:00:00`), "PPP")}
              />
              <Field label="Guest count" value={String(req.guest_count)} />
              <Field
                label="Estimated lbs"
                value={`${Number(req.estimated_lbs).toFixed(1)} lb`}
              />
              {req.event_time_slot ? (
                <Field
                  label="Time slot"
                  value={req.event_time_slot === "12:00" ? "12:00 PM" : "4:00 PM"}
                />
              ) : (
                <div className="flex flex-col gap-0.5 border-b border-nopal/5 pb-1 last:border-b-0">
                  <span className="text-xs uppercase tracking-wide text-mole/60">
                    Time slot
                  </span>
                  <span className="inline-flex w-fit items-center rounded-md border border-jamaica/40 bg-jamaica/10 px-2 py-0.5 text-sm font-semibold text-jamaica">
                    Custom time requested
                  </span>
                </div>
              )}
              {req.event_type ? (
                <Field label="Event type" value={req.event_type} />
              ) : null}
              {req.event_location ? (
                <Field label="Location" value={req.event_location} multiline />
              ) : null}
              {req.cuts_preference ? (
                <Field label="Cuts preference" value={req.cuts_preference} />
              ) : null}
              <Field
                label="Sides included"
                value={req.includes_sides ? "Yes" : "No"}
              />
              <Field
                label="Delivery needed"
                value={req.delivery_needed ? "Yes" : "No"}
              />
              {req.delivery_needed && req.delivery_miles !== null ? (
                <Field
                  label="Distance"
                  value={(() => {
                    const miles = Number(req.delivery_miles);
                    const fee = Math.max(0, miles - 10) * 2;
                    const feeLabel =
                      fee === 0 ? "Free (within 10 mi)" : `$${fee.toFixed(2)}`;
                    return `${miles.toFixed(1)} mi (${feeLabel})`;
                  })()}
                />
              ) : null}
            </CardContent>
          </Card>

          <CateringDetailActions
            id={req.id}
            initialStatus={req.status}
            initialQuotedPrice={
              req.quoted_price !== null ? Number(req.quoted_price) : null
            }
            initialNotes={req.notes ?? ""}
          />

          {/* TODO(stripe-deposit): once Stripe is wired for catering, add a
              deposit-intent action here so the owner can send a Stripe link
              to the customer from this page. */}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{req.full_name}</p>
              <a
                href={`tel:${req.phone}`}
                className="flex items-center gap-2 text-nopal hover:underline"
              >
                <Phone className="h-4 w-4" />
                {req.phone}
              </a>
              <a
                href={`mailto:${req.email}?subject=${encodeURIComponent(`Your catering request ${reference}`)}`}
                className="flex items-center gap-2 text-nopal hover:underline break-all"
              >
                <Mail className="h-4 w-4" />
                {req.email}
              </a>
              {req.customer_id ? (
                <p className="text-xs text-mole/50 font-mono">
                  user: {req.customer_id.slice(0, 8)}…
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <Field
                label="Submitted"
                value={format(new Date(req.created_at), "PPp")}
              />
              <Field
                label="Updated"
                value={format(new Date(req.updated_at), "PPp")}
              />
              {req.updated_by_admin_at ? (
                <Field
                  label="Last admin touch"
                  value={format(new Date(req.updated_by_admin_at), "PPp")}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-nopal/5 pb-1 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-mole/60">
        {label}
      </span>
      <span
        className={multiline ? "whitespace-pre-wrap text-mole" : "text-mole"}
      >
        {value}
      </span>
    </div>
  );
}
