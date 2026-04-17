import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/checkAdmin";
import {
  listContacts,
  listGroups,
} from "@/app/actions/admin/marketing";
import { GroupDetailClient } from "./GroupDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const svc = createServiceRoleClient();
  const { data: group } = await svc
    .from("customer_groups")
    .select("id, name, description, color, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  const [contactsRes, groupsRes] = await Promise.all([
    listContacts(),
    listGroups(),
  ]);
  const contacts = contactsRes.success ? (contactsRes.data ?? []) : [];
  const groups = groupsRes.success ? (groupsRes.data ?? []) : [];

  return (
    <GroupDetailClient
      group={{
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color ?? "oro",
      }}
      allContacts={contacts}
      allGroups={groups}
    />
  );
}
