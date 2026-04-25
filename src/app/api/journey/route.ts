import { NextResponse } from "next/server";
import { getNavitiaJourneys, estimateFare } from "@/lib/apis/navitia";
import { buildWalkOnlyJourney, getWalkingRoute, buildJourneyFromLegs } from "@/lib/apis/osrm";
import { getNearbyStops } from "@/lib/apis/overpass";
import type { Journey, JourneyLeg, TransportPreferences } from "@/types/transit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origin, destination, preferences, departureTime } = body as {
      origin: { name: string; lat: number; lng: number };
      destination: { name: string; lat: number; lng: number };
      preferences: TransportPreferences;
      departureTime?: string;
    };

    if (!origin || !destination) {
      return NextResponse.json({ error: "Origin and destination required" }, { status: 400 });
    }

    const now = departureTime ? new Date(departureTime) : new Date();
    const journeys: Journey[] = [];

    // Try Navitia if key present
    const navitiaKey = process.env.NAVITIA_API_KEY;
    if (navitiaKey) {
      const navJourneys = await getNavitiaJourneys(
        navitiaKey,
        origin.lat, origin.lng,
        destination.lat, destination.lng,
        preferences,
        departureTime
      );
      journeys.push(...navJourneys);
    }

    // Always add a walk-only option
    const walkJourney = await buildWalkOnlyJourney(origin, destination, now);
    if (walkJourney) {
      walkJourney.label = "Walk entire route";
      journeys.push(walkJourney);
    }

    // If no Navitia key, build synthetic transit journey using OSM stop data
    if (!navitiaKey) {
      const syntheticJourneys = await buildSyntheticJourneys(origin, destination, preferences, now);
      journeys.push(...syntheticJourneys);
    }

    // Sort by preference
    const sorted = sortJourneys(journeys, preferences.optimize);

    return NextResponse.json({ journeys: sorted.slice(0, 5) });
  } catch (err) {
    console.error("Journey API error:", err);
    return NextResponse.json({ error: "Journey planning failed" }, { status: 500 });
  }
}

async function buildSyntheticJourneys(
  origin: { name: string; lat: number; lng: number },
  destination: { name: string; lat: number; lng: number },
  preferences: TransportPreferences,
  now: Date
): Promise<Journey[]> {
  const journeys: Journey[] = [];
  const [nearOrigin, nearDest] = await Promise.all([
    getNearbyStops(origin.lat, origin.lng, 800),
    getNearbyStops(destination.lat, destination.lng, 800),
  ]);

  const wantsBus = preferences.modes.includes("bus");
  const wantsTrain = preferences.modes.includes("train");

  // Bus route: walk to nearest bus stop, transit, walk from nearest bus stop at dest
  if (wantsBus) {
    const busStopsOrigin = nearOrigin.filter((s) => s.type === "bus_stop");
    const busStopsDest = nearDest.filter((s) => s.type === "bus_stop");

    if (busStopsOrigin.length && busStopsDest.length) {
      const fromStop = busStopsOrigin[0];
      const toStop = busStopsDest[0];

      const [walkToStop, walkFromStop] = await Promise.all([
        getWalkingRoute([origin.lat, origin.lng], [fromStop.lat, fromStop.lng]),
        getWalkingRoute([toStop.lat, toStop.lng], [destination.lat, destination.lng]),
      ]);

      const walkToDur = walkToStop ? walkToStop.durationSec : dist2sec(origin, fromStop) * 1.4;
      const walkFromDur = walkFromStop ? walkFromStop.durationSec : dist2sec(toStop, destination) * 1.4;

      const busDist = haversine(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng) * 1000;
      const busDurSec = Math.round(busDist / 6) + 120; // ~6 m/s + 2 min waiting
      const busTime = new Date(now.getTime() + Math.ceil(walkToDur / 60) * 60000 + 120000);

      const legs: JourneyLeg[] = [];

      if (walkToDur > 30) {
        const t1 = new Date(now.getTime() + walkToDur * 1000);
        legs.push({
          mode: "walk",
          from: { name: origin.name, lat: origin.lat, lng: origin.lng },
          to: { name: fromStop.name, lat: fromStop.lat, lng: fromStop.lng },
          departureTime: now.toISOString(),
          arrivalTime: t1.toISOString(),
          durationMinutes: Math.round(walkToDur / 60),
          distanceMeters: walkToStop?.distanceM ?? Math.round((walkToDur / 60) * 80),
          cost: 0,
          geometry: walkToStop?.geometry ?? [[origin.lat, origin.lng], [fromStop.lat, fromStop.lng]],
          instructions: walkToStop?.steps ?? [`Walk to ${fromStop.name}`],
        });
      }

      const busArrival = new Date(busTime.getTime() + busDurSec * 1000);
      legs.push({
        mode: "bus",
        from: { name: fromStop.name, lat: fromStop.lat, lng: fromStop.lng },
        to: { name: toStop.name, lat: toStop.lat, lng: toStop.lng },
        departureTime: busTime.toISOString(),
        arrivalTime: busArrival.toISOString(),
        durationMinutes: Math.round(busDurSec / 60),
        distanceMeters: Math.round(busDist),
        lineName: "Local Bus",
        lineColor: "#f59e0b",
        cost: estimateFare("bus", busDist),
        geometry: [[fromStop.lat, fromStop.lng], [toStop.lat, toStop.lng]],
        instructions: [`Take bus towards ${toStop.name}`],
      });

      if (walkFromDur > 30) {
        const t3 = new Date(busArrival.getTime() + walkFromDur * 1000);
        legs.push({
          mode: "walk",
          from: { name: toStop.name, lat: toStop.lat, lng: toStop.lng },
          to: { name: destination.name, lat: destination.lat, lng: destination.lng },
          departureTime: busArrival.toISOString(),
          arrivalTime: t3.toISOString(),
          durationMinutes: Math.round(walkFromDur / 60),
          distanceMeters: walkFromStop?.distanceM ?? Math.round((walkFromDur / 60) * 80),
          cost: 0,
          geometry: walkFromStop?.geometry ?? [[toStop.lat, toStop.lng], [destination.lat, destination.lng]],
          instructions: walkFromStop?.steps ?? [`Walk to ${destination.name}`],
        });
      }

      const j = buildJourneyFromLegs(legs, now);
      j.label = "By Bus";
      journeys.push(j);
    }
  }

  // Train route
  if (wantsTrain) {
    const trainOrigin = nearOrigin.filter((s) => s.type === "train_station");
    const trainDest = nearDest.filter((s) => s.type === "train_station");

    if (trainOrigin.length && trainDest.length) {
      const fromStn = trainOrigin[0];
      const toStn = trainDest[0];

      const [walkToStn, walkFromStn] = await Promise.all([
        getWalkingRoute([origin.lat, origin.lng], [fromStn.lat, fromStn.lng]),
        getWalkingRoute([toStn.lat, toStn.lng], [destination.lat, destination.lng]),
      ]);

      const walkToDur = walkToStn ? walkToStn.durationSec : dist2sec(origin, fromStn) * 1.4;
      const walkFromDur = walkFromStn ? walkFromStn.durationSec : dist2sec(toStn, destination) * 1.4;
      const trainDist = haversine(fromStn.lat, fromStn.lng, toStn.lat, toStn.lng) * 1000;
      const trainDurSec = Math.round(trainDist / 25) + 300; // ~25 m/s + 5 min wait
      const trainDep = new Date(now.getTime() + Math.ceil((walkToDur + 300) / 60) * 60000);

      const legs: JourneyLeg[] = [];

      if (walkToDur > 30) {
        const t1 = new Date(now.getTime() + walkToDur * 1000);
        legs.push({
          mode: "walk",
          from: { name: origin.name, lat: origin.lat, lng: origin.lng },
          to: { name: fromStn.name, lat: fromStn.lat, lng: fromStn.lng },
          departureTime: now.toISOString(),
          arrivalTime: t1.toISOString(),
          durationMinutes: Math.round(walkToDur / 60),
          distanceMeters: walkToStn?.distanceM ?? Math.round((walkToDur / 60) * 80),
          cost: 0,
          geometry: walkToStn?.geometry ?? [[origin.lat, origin.lng], [fromStn.lat, fromStn.lng]],
          instructions: walkToStn?.steps ?? [`Walk to ${fromStn.name}`],
        });
      }

      const trainArr = new Date(trainDep.getTime() + trainDurSec * 1000);
      legs.push({
        mode: "train",
        from: { name: fromStn.name, lat: fromStn.lat, lng: fromStn.lng },
        to: { name: toStn.name, lat: toStn.lat, lng: toStn.lng },
        departureTime: trainDep.toISOString(),
        arrivalTime: trainArr.toISOString(),
        durationMinutes: Math.round(trainDurSec / 60),
        distanceMeters: Math.round(trainDist),
        lineName: "Local Rail",
        lineColor: "#3b82f6",
        cost: estimateFare("train", trainDist),
        geometry: [[fromStn.lat, fromStn.lng], [toStn.lat, toStn.lng]],
        instructions: [`Take train from ${fromStn.name} to ${toStn.name}`],
      });

      if (walkFromDur > 30) {
        const t3 = new Date(trainArr.getTime() + walkFromDur * 1000);
        legs.push({
          mode: "walk",
          from: { name: toStn.name, lat: toStn.lat, lng: toStn.lng },
          to: { name: destination.name, lat: destination.lat, lng: destination.lng },
          departureTime: trainArr.toISOString(),
          arrivalTime: t3.toISOString(),
          durationMinutes: Math.round(walkFromDur / 60),
          distanceMeters: walkFromStn?.distanceM ?? Math.round((walkFromDur / 60) * 80),
          cost: 0,
          geometry: walkFromStn?.geometry ?? [[toStn.lat, toStn.lng], [destination.lat, destination.lng]],
          instructions: walkFromStn?.steps ?? [`Walk to ${destination.name}`],
        });
      }

      const j = buildJourneyFromLegs(legs, now);
      j.label = "By Train";
      journeys.push(j);
    }
  }

  return journeys;
}

function sortJourneys(journeys: Journey[], optimize: string): Journey[] {
  return [...journeys].sort((a, b) => {
    if (optimize === "cheapest") return a.totalCost - b.totalCost;
    if (optimize === "fastest") return a.totalDurationMinutes - b.totalDurationMinutes;
    if (optimize === "fewest_changes") return a.legs.length - b.legs.length;
    return a.totalCost - b.totalCost;
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dist2sec(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  return Math.round((haversine(a.lat, a.lng, b.lat, b.lng) * 1000) / 80);
}
