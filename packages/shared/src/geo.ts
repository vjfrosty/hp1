import { BULGARIAN_CITIES } from './bulgaria';

export interface DistrictPoint {
  lat: number;
  lng: number;
}

/**
 * The district-level point for a city and neighbourhood.
 *
 * The server stores this, never the coordinates a client sends, so an event
 * can never carry exact home GPS (AGENTS.md, rule 4). Falls back to the city
 * centre when the neighbourhood is unknown, and returns null for an unknown city.
 */
export function districtPoint(city: string, neighborhood?: string | null): DistrictPoint | null {
  const cityInfo = BULGARIAN_CITIES.find((c) => c.name === city);
  if (!cityInfo) return null;
  const hood = neighborhood ? cityInfo.neighborhoods.find((n) => n.name === neighborhood) : undefined;
  const [lat, lng] = hood?.coords ?? cityInfo.coords;
  return { lat, lng };
}
