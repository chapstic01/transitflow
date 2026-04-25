"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { JourneyPlanner } from "@/components/Journey/JourneyPlanner";
import { useJourneyStore } from "@/store/journeyStore";
import { MapPin, Layers, X } from "lucide-react";

const DynamicMap = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-2 border-transit-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const { origin, destination, setMapCenter, setNearbyStops, setOrigin } = useJourneyStore();
  const [showStops, setShowStops] = useState(true);
  const [mobilePanel, setMobilePanel] = useState(false);

  // Get user location on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setMapCenter([coords.latitude, coords.longitude], 14);
          if (!origin) {
            setOrigin({
              name: "My Location",
              lat: coords.latitude,
              lng: coords.longitude,
            });
          }
          fetchStops(coords.latitude, coords.longitude);
        },
        () => {
          // Default to London if no geolocation
          setMapCenter([51.505, -0.09], 13);
          fetchStops(51.505, -0.09);
        }
      );
    }
  }, []);

  async function fetchStops(lat: number, lng: number) {
    if (!showStops) return;
    try {
      const res = await fetch(`/api/stops?lat=${lat}&lng=${lng}&radius=600`);
      const data = await res.json();
      setNearbyStops(data.stops || []);
    } catch { /* silent */ }
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-[380px] flex-shrink-0 border-r border-gray-800 overflow-hidden">
        <JourneyPlanner />
      </aside>

      {/* Map — full screen on mobile, right side on desktop */}
      <main className="flex-1 relative">
        <DynamicMap />

        {/* Toggle stops overlay */}
        <button
          onClick={() => {
            const next = !showStops;
            setShowStops(next);
            if (next && origin) fetchStops(origin.lat, origin.lng);
            else setNearbyStops([]);
          }}
          className="absolute top-4 right-14 z-[1000] bg-gray-900/90 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 flex items-center gap-1.5 hover:bg-gray-800 transition-colors backdrop-blur-sm shadow"
          title="Toggle nearby stops"
        >
          <Layers className="w-3.5 h-3.5" />
          {showStops ? "Stops on" : "Stops off"}
        </button>

        {/* Mobile: open planner button */}
        <button
          onClick={() => setMobilePanel(true)}
          className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-transit-600 text-white px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg"
        >
          <MapPin className="w-4 h-4" />
          Plan Journey
        </button>

        {/* Right-click hint */}
        <div className="hidden md:block absolute bottom-8 left-4 z-[1000] bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500 backdrop-blur-sm">
          Right-click map to set origin / destination
        </div>
      </main>

      {/* Mobile panel — slide-up sheet */}
      {mobilePanel && (
        <div className="md:hidden fixed inset-0 z-[2000] flex flex-col justify-end bg-black/50 animate-fade-in">
          <div className="bg-gray-950 rounded-t-2xl h-[85vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-700 mx-auto" />
              <button
                onClick={() => setMobilePanel(false)}
                className="absolute right-4 top-3 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <JourneyPlanner />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
