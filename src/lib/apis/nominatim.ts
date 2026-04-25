import type { SearchResult } from "@/types/transit";

const BASE = "https://nominatim.openstreetmap.org";

export async function searchPlaces(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "8",
    featuretype: "settlement",
  });
  const res = await fetch(`${BASE}/search?${params}`, {
    headers: { "Accept-Language": "en", "User-Agent": "TransitFlow/1.0" },
  });
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  return data.map((item: Record<string, unknown>) => ({
    name: (item.name as string) || String(item.display_name).split(",")[0],
    displayName: item.display_name as string,
    lat: parseFloat(item.lat as string),
    lng: parseFloat(item.lon as string),
    type: item.type as string,
    importance: item.importance as number,
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: "json",
  });
  const res = await fetch(`${BASE}/reverse?${params}`, {
    headers: { "Accept-Language": "en", "User-Agent": "TransitFlow/1.0" },
  });
  if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const data = await res.json();
  return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
