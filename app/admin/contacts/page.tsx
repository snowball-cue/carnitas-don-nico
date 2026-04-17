import { listContacts, listGroups } from "@/app/actions/admin/marketing";
import { ContactsClient } from "./ContactsClient";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const [contactsRes, groupsRes] = await Promise.all([
    listContacts(),
    listGroups(),
  ]);
  const contacts = contactsRes.success ? (contactsRes.data ?? []) : [];
  const groups = groupsRes.success ? (groupsRes.data ?? []) : [];

  return <ContactsClient initialContacts={contacts} groups={groups} />;
}
