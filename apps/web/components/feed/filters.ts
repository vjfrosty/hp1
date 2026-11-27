import type { PublicEvent, SeasonalThemeId, TimeBucket, VenueType } from "@hp1/shared";
import { dateLabel, timeBucket } from "@hp1/shared";

export type DateFilter = "всички" | "днес" | "утре" | "уикенда";
export type TimeFilter = "всички" | TimeBucket;
export type VisibilityFilter = "всички" | "публични" | "приятели";

export interface FeedFilters {
  neighborhood: string; // "Всички" = any
  date: DateFilter;
  time: TimeFilter;
  venue: "всички" | VenueType;
  visibility: VisibilityFilter;
  theme: "all" | SeasonalThemeId;
  onlyWithSeats: boolean;
  onlyNonAlcoholic: boolean;
  search: string;
}

export const DEFAULT_FILTERS: FeedFilters = {
  neighborhood: "Всички",
  date: "всички",
  time: "всички",
  venue: "всички",
  visibility: "всички",
  theme: "all",
  onlyWithSeats: false,
  onlyNonAlcoholic: false,
  search: "",
};

/** Client-side feed filters over the server list (city is filtered by the API). */
export function filterEvents(events: PublicEvent[], f: FeedFilters, now: Date = new Date()): PublicEvent[] {
  const q = f.search.trim().toLowerCase();
  return events.filter((e) => {
    if (f.neighborhood !== "Всички" && e.neighborhood !== f.neighborhood) return false;
    if (f.date !== "всички" && dateLabel(e.startsAt, now) !== f.date) return false;
    if (f.time !== "всички" && timeBucket(e.startsAt) !== f.time) return false;
    if (f.venue !== "всички" && e.venueType !== f.venue) return false;
    if (f.visibility === "публични" && (e.isPrivate || e.friendsOnly)) return false;
    if (f.visibility === "приятели" && !e.friendsOnly && !e.isPrivate) return false;
    if (f.theme !== "all" && e.seasonalTheme !== f.theme) return false;
    if (f.onlyWithSeats && (e.isCancelled || e.counts.confirmed >= e.maxAttendees)) return false;
    if (f.onlyNonAlcoholic && !e.nonAlcoholicFriendly) return false;
    if (q) {
      const hay = `${e.title} ${e.description} ${e.city} ${e.neighborhood} ${e.venueName} ${e.plannedFood}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
