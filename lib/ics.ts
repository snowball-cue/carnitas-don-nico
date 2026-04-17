/**
 * iCalendar (RFC 5545) generator for Carnitas Don Nico catering events.
 *
 * Produces a VCALENDAR payload with a single VEVENT + two VALARM reminders
 * (7 days before + 24 hours before) and a VTIMEZONE for America/Chicago so
 * Outlook, Apple Mail and Google Calendar all render the wall-clock time
 * that the customer actually picked.
 */
export interface GenerateCateringIcsInput {
  /** catering_requests.id (uuid) — used as the VEVENT UID. */
  uid: string;
  /** Human reference, e.g. "CAT-ABC123". */
  reference: string;
  /** YYYY-MM-DD in America/Chicago local calendar. */
  eventDate: string;
  /** "12:00" | "16:00" | null (null => custom time TBD, placeholder 09:00). */
  timeSlot: "12:00" | "16:00" | null;
  guestCount: number;
  estimatedLbs: number;
  deliveryNeeded: boolean;
  /** Where the food goes (delivery address or event venue). */
  eventLocation?: string | null;
  /** Pickup address for non-delivery. */
  pickupAddress: string;
  customerName: string;
  summaryLocale: "en" | "es";
}

const CRLF = "\r\n";

/**
 * Escape text per RFC 5545 §3.3.11:
 *   \\ -> \\\\, newline -> \n, ; -> \;, , -> \,
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Two-digit left-pad. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Current UTC timestamp in iCal basic format: YYYYMMDDTHHMMSSZ. */
function utcStamp(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  const hh = pad2(now.getUTCHours());
  const mm = pad2(now.getUTCMinutes());
  const ss = pad2(now.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * Given a YYYY-MM-DD + HH:MM local time, return the floating local datetime
 * formatted as YYYYMMDDTHHMMSS (no trailing Z — this is a local time paired
 * with the TZID parameter).
 */
function localStamp(dateYmd: string, hh: number, mm: number): string {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  const yy = String(y).padStart(4, "0");
  const moo = pad2(mo ?? 1);
  const dd = pad2(d ?? 1);
  return `${yy}${moo}${dd}T${pad2(hh)}${pad2(mm)}00`;
}

/**
 * Add `minutes` minutes to a floating local datetime (YYYYMMDDTHHMMSS).
 * We do the math in UTC on a synthetic Date — this is safe because both
 * start and end live in the same wall-clock timezone and we're not
 * crossing DST with a 90-minute offset.
 */
function addMinutesToLocalStamp(stamp: string, minutes: number): string {
  const y = Number(stamp.slice(0, 4));
  const mo = Number(stamp.slice(4, 6));
  const d = Number(stamp.slice(6, 8));
  const hh = Number(stamp.slice(9, 11));
  const mm = Number(stamp.slice(11, 13));
  const utc = Date.UTC(y, mo - 1, d, hh, mm, 0) + minutes * 60_000;
  const out = new Date(utc);
  return (
    `${out.getUTCFullYear()}` +
    `${pad2(out.getUTCMonth() + 1)}` +
    `${pad2(out.getUTCDate())}` +
    `T${pad2(out.getUTCHours())}` +
    `${pad2(out.getUTCMinutes())}` +
    `00`
  );
}

/**
 * Minimal VTIMEZONE for America/Chicago. Covers the current US DST rules
 * (2nd Sunday of March forward, 1st Sunday of November back) which are the
 * only rules we need — bookings are always future dates.
 */
function vtimezoneChicago(): string {
  return [
    "BEGIN:VTIMEZONE",
    "TZID:America/Chicago",
    "X-LIC-LOCATION:America/Chicago",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0600",
    "TZOFFSETTO:-0500",
    "TZNAME:CDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0600",
    "TZNAME:CST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ].join(CRLF);
}

/**
 * Generate a full VCALENDAR string for a catering request.
 *
 * Includes a VTIMEZONE for America/Chicago and a single VEVENT with two
 * VALARM blocks (−7 days and −24 hours). The caller is responsible for
 * presenting this to the user as an `.ics` download or email attachment.
 */
export function generateCateringIcs(input: GenerateCateringIcsInput): string {
  const {
    uid,
    reference,
    eventDate,
    timeSlot,
    guestCount,
    estimatedLbs,
    deliveryNeeded,
    eventLocation,
    pickupAddress,
    customerName,
    summaryLocale,
  } = input;

  const [startHour, startMin] =
    timeSlot === "12:00"
      ? [12, 0]
      : timeSlot === "16:00"
        ? [16, 0]
        : [9, 0]; // null => placeholder until we confirm.

  const dtStart = localStamp(eventDate, startHour, startMin);
  const dtEnd = addMinutesToLocalStamp(dtStart, 90);

  const summary =
    summaryLocale === "en"
      ? `Carnitas Don Nico — ${estimatedLbs} lb catering`
      : `Carnitas Don Nico — catering ${estimatedLbs} lb`;

  const locationRaw = deliveryNeeded
    ? eventLocation && eventLocation.trim().length > 0
      ? eventLocation
      : "TBD"
    : pickupAddress;

  const descriptionLines: string[] = [];
  descriptionLines.push(`Reference: ${reference}`);
  descriptionLines.push(`Customer: ${customerName}`);
  descriptionLines.push(
    `${guestCount} guests · ${estimatedLbs} lb estimated`,
  );
  if (deliveryNeeded) {
    descriptionLines.push(
      `Delivery to: ${eventLocation && eventLocation.trim().length > 0 ? eventLocation : "address TBD"}`,
    );
  } else {
    descriptionLines.push(`Pickup at: ${pickupAddress}`);
  }
  if (timeSlot === null) {
    descriptionLines.push(
      "Time is a placeholder — Don Nico will confirm the exact time with you.",
    );
  }
  descriptionLines.push(
    "Payment: deposit locks in your date; balance due on delivery/pickup.",
  );
  const description = descriptionLines.join("\n");

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Carnitas Don Nico//Catering//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(vtimezoneChicago());
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${uid}@carnitasdonnico.com`);
  lines.push(`DTSTAMP:${utcStamp()}`);
  lines.push(`DTSTART;TZID=America/Chicago:${dtStart}`);
  lines.push(`DTEND;TZID=America/Chicago:${dtEnd}`);
  lines.push(`SUMMARY:${escapeText(summary)}`);
  lines.push(`DESCRIPTION:${escapeText(description)}`);
  lines.push(`LOCATION:${escapeText(locationRaw)}`);
  lines.push("STATUS:CONFIRMED");
  lines.push("TRANSP:OPAQUE");
  // 7-day reminder
  lines.push("BEGIN:VALARM");
  lines.push("TRIGGER:-P7D");
  lines.push("ACTION:DISPLAY");
  lines.push("DESCRIPTION:Don Nico catering in 7 days");
  lines.push("END:VALARM");
  // 24-hour reminder
  lines.push("BEGIN:VALARM");
  lines.push("TRIGGER:-PT24H");
  lines.push("ACTION:DISPLAY");
  lines.push("DESCRIPTION:Don Nico catering tomorrow");
  lines.push("END:VALARM");
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  // Note: RFC 5545 requires line folding at 75 octets. Virtually every
  // modern calendar client accepts unfolded lines, so we skip folding for
  // MVP simplicity.
  return lines.join(CRLF) + CRLF;
}
