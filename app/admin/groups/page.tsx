import { listGroups } from "@/app/actions/admin/marketing";
import { GroupsClient } from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const res = await listGroups();
  const groups = res.success ? (res.data ?? []) : [];
  return <GroupsClient initialGroups={groups} />;
}
