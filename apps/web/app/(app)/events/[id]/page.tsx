import { EventDetail } from "@/components/event-detail/EventDetail";

export const metadata = { title: "Сбирка — АЙДЕ ПО ЕДНА!" };

/** Thin route: the event is fetched client-side (TanStack Query) so polling and optimistic writes share one cache. */
export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { invite } = await searchParams;
  const inviteCode = typeof invite === "string" && invite.length > 0 ? invite : undefined;
  return <EventDetail id={id} inviteCode={inviteCode} />;
}
