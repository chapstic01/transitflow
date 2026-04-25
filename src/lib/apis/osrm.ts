import type { LatLng, JourneyLeg, Journey } from "@/types/transit";

const FOOT_BASE = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const DRIVE_BASE = "https://router.project-osrm.org/route/v1/driving";

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export async function getWalkingRoute(
  from: [number, number],
  to: [number, number]
): Promise<{ durationSec: number; distanceM: number; geometry: LatLng[]; steps: string[] } | null> {
  try {
    const url = `${FOOT_BASE}/${from[1]},${from[0]};${to[1]},${to[0]}?steps=true&geometries=polyline&overview=full`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const steps: string[] = [];
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        if (step.maneuver?.instruction) steps.push(step.maneuver.instruction);
        else if (step.name) steps.push(`Continue on ${step.name}`);
      }
    }
    return {
      durationSec: Math.round(route.duration),
      distanceM: Math.round(route.distance),
      geometry: decodePolyline(route.geometry),
      steps,
    };
  } catch {
    return null;
  }
}

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function buildWalkOnlyJourney(
  from: { name: string; lat: number; lng: number },
  to: { name: string; lat: number; lng: number },
  now: Date
): Promise<Journey | null> {
  const route = await getWalkingRoute([from.lat, from.lng], [to.lat, to.lng]);
  if (!route) {
    const dist = haversineKm([from.lat, from.lng], [to.lat, to.lng]) * 1000;
    const dur = Math.round(dist / 80);
    const arr = new Date(now.getTime() + dur * 1000);
    const leg: JourneyLeg = {
      mode: "walk",
      from: { name: from.name, lat: from.lat, lng: from.lng },
      to: { name: to.name, lat: to.lat, lng: to.lng },
      departureTime: now.toISOString(),
      arrivalTime: arr.toISOString(),
      durationMinutes: Math.round(dur / 60),
      distanceMeters: Math.round(dist),
      cost: 0,
      geometry: [[from.lat, from.lng], [to.lat, to.lng]],
      instructions: [`Walk to ${to.name}`],
    };
    return buildJourneyFromLegs([leg], now);
  }
  const arr = new Date(now.getTime() + route.durationSec * 1000);
  const leg: JourneyLeg = {
    mode: "walk",
    from: { name: from.name, lat: from.lat, lng: from.lng },
    to: { name: to.name, lat: to.lat, lng: to.lng },
    departureTime: now.toISOString(),
    arrivalTime: arr.toISOString(),
    durationMinutes: Math.round(route.durationSec / 60),
    distanceMeters: route.distanceM,
    cost: 0,
    geometry: route.geometry,
    instructions: route.steps,
  };
  return buildJourneyFromLegs([leg], now);
}

export function buildJourneyFromLegs(legs: JourneyLeg[], _now: Date): Journey {
  const total = legs.reduce((s, l) => s + l.durationMinutes, 0);
  const cost = legs.reduce((s, l) => s + (l.cost ?? 0), 0);
  const walk = legs.filter((l) => l.mode === "walk").reduce((s, l) => s + l.distanceMeters, 0);
  return {
    id: Math.random().toString(36).slice(2),
    legs,
    totalDurationMinutes: total,
    totalCost: cost,
    totalWalkingMeters: walk,
    departureTime: legs[0].departureTime,
    arrivalTime: legs[legs.length - 1].arrivalTime,
    co2Grams: estimateCO2(legs),
  };
}

function estimateCO2(legs: JourneyLeg[]): number {
  return legs.reduce((sum, leg) => {
    const km = leg.distanceMeters / 1000;
    const rates: Record<string, number> = { bus: 89, train: 41, metro: 41, ferry: 115, walk: 0 };
    return sum + km * (rates[leg.mode] ?? 50);
  }, 0);
}
