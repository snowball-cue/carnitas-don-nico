import {
  listContacts,
  listGroups,
} from "@/app/actions/admin/marketing";
import { NewBroadcastClient } from "./NewBroadcastClient";

export const dynamic = "force-dynamic";

export default async function NewBroadcastPage() {
  const isTestMode =
    (process.env.RESEND_FROM || "").toLowerCase().includes(
      "onboarding@resend.dev",
    ) ||
    !process.env.RESEND_FROM;

  const [contactsRes, groupsRes] = await Promise.all([
    listContacts(),
    listGroups(),
  ]);
  const contacts = contactsRes.success ? (contactsRes.data ?? []) : [];
  const groups = groupsRes.success ? (groupsRes.data ?? []) : [];

  return (
    <NewBroadcastClient
      contacts={contacts}
      groups={groups}
      isTestMode={isTestMode}
      testModeCap={50}
    />
  );
}
