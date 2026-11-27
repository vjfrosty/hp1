import { GroupDetail } from "@/components/groups/group-detail";

export const metadata = { title: "Дружина — АЙДЕ ПО ЕДНА!" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetail id={id} />;
}
