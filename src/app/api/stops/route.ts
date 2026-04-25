import { NextResponse } from "next/server";
import { getNearbyStops } from "@/lib/apis/overpass";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseInt(searchParams.get("radius") || "500");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const stops = await getNearbyStops(lat, lng, Math.min(radius, 1000));
  return NextResponse.json({ stops });
}
