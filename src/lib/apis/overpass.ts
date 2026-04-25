import type { Stop } from "@/types/transit";

const OVERPASS = "https://overpass-api.de/api/interpreter";

export async function getNearbyStops(
  lat: number,
  lng: number,
  radiusMeters = 500
): Promise<Stop[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
      node["public_transport"="stop_position"](around:${radiusMeters},${lat},${lng});
      node["railway"="station"](around:${radiusMeters},${lat},${lng});
      node["railway"="halt"](around:${radiusMeters},${lat},${lng});
      node["amenity"="ferry_terminal"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;
  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements || [])
      .filter((el: Record<string, unknown>) => el.lat && el.lon)
      .map((el: Record<string, unknown>) => {
        const tags = (el.tags || {}) as Record<string, string>;
        let type: Stop["type"] = "bus_stop";
        if (tags.railway === "station" || tags.railway === "halt") type = "train_station";
        else if (tags.station === "subway" || tags.subway === "yes") type = "metro_station";
        else if (tags.amenity === "ferry_terminal") type = "ferry_terminal";
        return {
          id: String(el.id),
          name: tags.name || tags["name:en"] || "Unnamed Stop",
          lat: el.lat as number,
          lng: el.lon as number,
          type,
          wheelchair: tags.wheelchair === "yes",
        };
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

export async function getStopsAlongRoute(
  points: [number, number][],
  radiusMeters = 200
): Promise<Stop[]> {
  if (points.length === 0) return [];
  const sample = points.filter((_, i) => i % Math.ceil(points.length / 8) === 0).slice(0, 8);
  const around = sample
    .map(([lat, lng]) => `node["public_transport"](around:${radiusMeters},${lat},${lng});`)
    .join("\n");
  const query = `[out:json][timeout:15];\n(${around});\nout body;`;
  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements || [])
      .filter((el: Record<string, unknown>) => el.lat && el.lon)
      .map((el: Record<string, unknown>) => {
        const tags = (el.tags || {}) as Record<string, string>;
        return {
          id: String(el.id),
          name: tags.name || "Stop",
          lat: el.lat as number,
          lng: el.lon as number,
          type: "bus_stop" as const,
          wheelchair: tags.wheelchair === "yes",
        };
      });
  } catch {
    return [];
  }
}
