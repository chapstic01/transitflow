"use client";
import { useState } from "react";
import {
  ArrowUpDown, Navigation, Calendar, ChevronDown, ChevronUp,
  Sparkles, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJourneyStore } from "@/store/journeyStore";
import { LocationInput } from "./LocationInput";
import { RouteCard } from "./RouteCard";
import { TransportPreferences } from "@/components/Preferences/TransportPreferences";
import { Spinner } from "@/components/UI/Spinner";
import type { SearchResult } from "@/types/transit";

export function JourneyPlanner() {
  const {
    origin, destination, journeys, selectedJourney, loading, error, preferences,
    departureTime, isPremium,
    setOrigin, setDestination, setJourneys, selectJourney,
    setLoading, setError, setDepartureTime, setMapCenter, swapLocations, reset,
  } = useJourneyStore();

  const [originText, setOriginText] = useState(origin?.name || "");
  const [destText, setDestText] = useState(destination?.name || "");
  const [showPrefs, setShowPrefs] = useState(false);

  function handleOriginSelect(r: SearchResult) {
    setOriginText(r.name);
    setOrigin({ name: r.name, lat: r.lat, lng: r.lng });
    setMapCenter([r.lat, r.lng]);
  }

  function handleDestSelect(r: SearchResult) {
    setDestText(r.name);
    setDestination({ name: r.name, lat: r.lat, lng: r.lng });
  }

  function handleSwap() {
    setOriginText(destText);
    setDestText(originText);
    swapLocations();
  }

  async function planJourney() {
    if (!origin || !destination) {
      setError("Please enter both origin and destination");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, preferences, departureTime: departureTime || undefined }),
      });
      if (!res.ok) throw new Error("Planning failed");
      const data = await res.json();
      setJourneys(data.journeys || []);
      if (data.journeys?.length > 0) selectJourney(data.journeys[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to plan journey");
    } finally {
      setLoading(false);
    }
  }

  const canPlan = !!origin && !!destination && !loading;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 bg-transit-600 rounded-lg flex items-center justify-center">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">TransitFlow</h1>
          {isPremium && (
            <span className="ml-auto text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold">
              Premium
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Journey planner · Get there cheaper</p>
      </div>

      {/* Inputs */}
      <div className="p-4 space-y-2 border-b border-gray-800">
        <div className="relative">
          <LocationInput
            value={originText}
            placeholder="From: your current location or address"
            onChange={setOriginText}
            onSelect={handleOriginSelect}
            onClear={() => { setOriginText(""); setOrigin(null); reset(); }}
            icon={<div className="w-3 h-3 rounded-full bg-emerald-500" />}
          />
          <button
            onClick={handleSwap}
            className="absolute -bottom-4 right-3 z-10 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-full p-1 transition-colors"
            title="Swap"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
          </button>
        </div>
        <LocationInput
          value={destText}
          placeholder="To: destination"
          onChange={setDestText}
          onSelect={handleDestSelect}
          onClear={() => { setDestText(""); setDestination(null); reset(); }}
          icon={<div className="w-3 h-3 rounded-full bg-red-500" />}
          className="mt-2"
        />

        {/* Departure time */}
        <div className="flex items-center gap-2 pt-1">
          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-transit-500"
          />
        </div>

        {/* Preferences toggle */}
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <span>Transport preferences</span>
          {showPrefs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showPrefs && <TransportPreferences />}

        <button
          onClick={planJourney}
          disabled={!canPlan}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
            canPlan
              ? "bg-transit-600 hover:bg-transit-500 text-white shadow-lg hover:shadow-transit-700/30 active:scale-95"
              : "bg-gray-800 text-gray-600 cursor-not-allowed"
          )}
        >
          {loading ? (
            <><Spinner className="w-4 h-4" /> Planning…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Plan Journey</>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {journeys.length > 0 && (
          <>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              {journeys.length} route{journeys.length !== 1 ? "s" : ""} found
            </p>
            {journeys.map((j, i) => (
              <RouteCard
                key={j.id}
                journey={j}
                selected={selectedJourney?.id === j.id}
                rank={i}
                onSelect={() => selectJourney(j)}
              />
            ))}

            {/* Premium upsell */}
            {!isPremium && (
              <div className="rounded-xl border border-amber-800/50 bg-amber-900/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">TransitFlow Premium</span>
                </div>
                <ul className="text-xs text-gray-400 space-y-1 mb-3">
                  <li>• Live bus & train departure times</li>
                  <li>• Offline maps & stops</li>
                  <li>• Service disruption alerts</li>
                  <li>• Save favourite journeys</li>
                </ul>
                <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-lg text-sm transition-colors">
                  Unlock Premium · £2.99/mo
                </button>
              </div>
            )}
          </>
        )}

        {!loading && journeys.length === 0 && origin && destination && (
          <div className="text-center py-8 text-gray-500">
            <Navigation className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Press &quot;Plan Journey&quot; to find routes</p>
          </div>
        )}

        {!origin && !destination && (
          <div className="text-center py-8 text-gray-600">
            <Navigation className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter your start and end points to begin</p>
            <p className="text-xs mt-2 opacity-60">Finds the cheapest route by bus, train or on foot</p>
          </div>
        )}
      </div>
    </div>
  );
}
