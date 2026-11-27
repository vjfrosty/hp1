export type TabId = "feed" | "radar" | "create" | "groups" | "chronicle" | "profile";

export const TAB_HREF: Record<TabId, string> = {
  feed: "/feed",
  radar: "/radar",
  create: "/events/new",
  groups: "/groups",
  chronicle: "/chronicle",
  profile: "/profile",
};

/** The tab a pathname belongs to; event detail counts as the feed. */
export function tabForPath(pathname: string): TabId | null {
  if (pathname.startsWith("/events/new")) return "create";
  if (pathname.startsWith("/events/") || pathname.startsWith("/feed")) return "feed";
  for (const id of ["radar", "groups", "chronicle", "profile"] as const) {
    if (pathname === TAB_HREF[id] || pathname.startsWith(`${TAB_HREF[id]}/`)) return id;
  }
  return null;
}

/** The mobile bar has four tabs, so radar folds into feed and chronicle into groups. */
export function mobileTabFor(tab: TabId | null): TabId | null {
  if (tab === "radar") return "feed";
  if (tab === "chronicle") return "groups";
  return tab;
}
