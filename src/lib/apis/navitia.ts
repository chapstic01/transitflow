import type { Journey, JourneyLeg, LatLng, TransportPreferences } from "@/types/transit";
import { buildJourneyFromLegs } from "./osrm";

const BASE = "https://api.navitia.io/v1";

function modeToNavitia(modes: string[]): string[] {
  const map: Record<string, string> = {
    bus: "physical_mode:Bus",
    train: "physical_mode:Train",
    metro: "physical_mode:Metro",
    ferry: "physical_mode:Ferry",
    walk: "physical_mode:Walking",
  };
  return modes.flatMap((m) => (map[m] ? [map[m]] : []));
}

function parseNavitiaJourney(j: Record<string, unknown>, now: Date): Journey | null {
  try {
    const sections = (j.sections as Record<string, unknown>[]) || [];
    const legs: JourneyLeg[] = [];
    for (const sec of sections) {
      const type = sec.type as string;
      if (type === "waiting") continue;
      const from = sec.from as Record<string, unknown>;
      const to = sec.to as Record<string, unknown>;
      const display = sec.display_informations as Record<string, unknown> | undefined;
      const geojson = sec.geojson as Record<string, unknown> | undefined;
      const coords = (geojson?.coordinates as number[][] | undefined)?.map(
        ([lng, lat]) => [lat, lng] as LatLng
      );
      let mode: JourneyLeg["mode"] = "walk";
      if (type === "public_transport") {
        const commercial = (display?.commercial_mode as string || "").toLowerCase();
        if (commercial.includes("bus")) mode = "bus";
        else if (commercial.includes("train") || commercial.includes("rail")) mode = "train";
        else if (commercial.includes("metro") || commercial.includes("subway")) mode = "metro";
        else if (commercial.includes("ferry")) mode = "ferry";
        else mode = "bus";
      }
      const dur = (sec.duration as number) || 0;
      const dist = (sec.length as number) || 0;
      const dep = (sec.departure_date_time as string) || now.toISOString();
      const arr = (sec.arrival_date_time as string) || now.toISOString();
      const fromName = (from?.name as string) || (from?.stop_point as Record<string,unknown>)?.name as string || "Origin";
      const toName = (to?.name as string) || (to?.stop_point as Record<string,unknown>)?.name as string || "Destination";
      const fromStop = (from?.stop_point || from) as Record<string, unknown>;
      const toStop = (to?.stop_point || to) as Record<string, unknown>;
      const fromCoord = (fromStop?.coord as Record<string,string>) || {};
      const toCoord = (toStop?.coord as Record<string,string>) || {};
      legs.push({
        mode,
        from: {
          name: fromName,
          lat: parseFloat(fromCoord.lat || "0"),
          lng: parseFloat(fromCoord.lon || "0"),
        },
        to: {
          name: toName,
          lat: parseFloat(toCoord.lat || "0"),
          lng: parseFloat(toCoord.lon || "0"),
        },
        departureTime: dep,
        arrivalTime: arr,
        durationMinutes: Math.round(dur / 60),
        distanceMeters: dist,
        lineName: display?.label as string | undefined,
        lineColor: display?.color ? `#${display.color}` : undefined,
        direction: display?.direction as string | undefined,
        geometry: coords,
        cost: mode === "walk" ? 0 : estimateFare(mode, dist),
      });
    }
    if (legs.length === 0) return null;
    return buildJourneyFromLegs(legs, now);
  } catch {
    return null;
  }
}

function estimateFare(mode: string, distanceM: number): number {
  const km = distanceM / 1000;
  if (mode === "walk") return 0;
  if (mode === "bus") return Math.min(2.5 + km * 0.1, 5.5);
  if (mode === "metro") return Math.min(1.8 + km * 0.15, 6.0);
  if (mode === "train") return Math.max(2.5, 1.5 + km * 0.12);
  if (mode === "ferry") return Math.max(3.5, 2.0 + km * 0.2);
  return 2.0;
}

export async function getNavitiaJourneys(
  apiKey: string,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  preferences: TransportPreferences,
  departureTime?: string
): Promise<Journey[]> {
  const params = new URLSearchParams({
    from: `${fromLng};${fromLat}`,
    to: `${toLng};${toLat}`,
    datetime: departureTime || new Date().toISOString().replace(/[-:]/g, "").slice(0, 15),
    count: "5",
    max_walking_duration_to_pt: String(preferences.maxWalkingMinutes * 60),
  });

  const forbiddenUris = modeToNavitia(
    ["bus", "train", "metro", "ferry", "walk"].filter(
      (m) => !preferences.modes.includes(m as never)
    )
  );
  forbiddenUris.forEach((u) => params.append("forbidden_uris[]", u));

  if (preferences.optimize === "fastest") params.set("datetime_represents", "departure");
  if (preferences.wheelchairAccessible) params.append("traveler_type", "wheelchair");

  const res = await fetch(`${BASE}/journeys?${params}`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const now = new Date();
  return (data.journeys || [])
    .map((j: Record<string, unknown>) => parseNavitiaJourney(j, now))
    .filter(Boolean) as Journey[];
}

export { estimateFare };
