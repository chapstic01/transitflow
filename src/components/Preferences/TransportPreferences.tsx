"use client";
import { Bus, Train, Ship, Footprints, Zap, PiggyBank, GitMerge, Accessibility } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJourneyStore } from "@/store/journeyStore";
import type { TransportMode } from "@/types/transit";

const MODES: { id: TransportMode; label: string; Icon: React.ElementType; color: string }[] = [
  { id: "bus", label: "Bus", Icon: Bus, color: "bg-amber-500" },
  { id: "train", label: "Train", Icon: Train, color: "bg-blue-500" },
  { id: "metro", label: "Metro", Icon: Train, color: "bg-purple-500" },
  { id: "ferry", label: "Ferry", Icon: Ship, color: "bg-cyan-500" },
  { id: "walk", label: "Walk", Icon: Footprints, color: "bg-emerald-500" },
];

const OPTIMIZE = [
  { id: "cheapest" as const, label: "Cheapest", Icon: PiggyBank },
  { id: "fastest" as const, label: "Fastest", Icon: Zap },
  { id: "fewest_changes" as const, label: "Fewest Changes", Icon: GitMerge },
];

export function TransportPreferences() {
  const { preferences, updatePreferences } = useJourneyStore();

  function toggleMode(mode: TransportMode) {
    const has = preferences.modes.includes(mode);
    const next = has
      ? preferences.modes.filter((m) => m !== mode)
      : [...preferences.modes, mode];
    if (next.length === 0) return;
    updatePreferences({ modes: next });
  }

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-xl border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Transport Modes</h3>
      <div className="flex flex-wrap gap-2">
        {MODES.map(({ id, label, Icon, color }) => {
          const active = preferences.modes.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggleMode(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                active
                  ? `${color} text-white shadow-lg scale-105`
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider pt-2">Optimise For</h3>
      <div className="flex gap-2">
        {OPTIMIZE.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => updatePreferences({ optimize: id })}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium transition-all",
              preferences.optimize === id
                ? "bg-transit-600 text-white shadow"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider pt-2">
        Max Walking: {preferences.maxWalkingMinutes} min
      </h3>
      <input
        type="range"
        min={5}
        max={60}
        step={5}
        value={preferences.maxWalkingMinutes}
        onChange={(e) => updatePreferences({ maxWalkingMinutes: parseInt(e.target.value) })}
        className="w-full accent-transit-500"
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={preferences.wheelchairAccessible}
          onChange={(e) => updatePreferences({ wheelchairAccessible: e.target.checked })}
          className="rounded accent-transit-500"
        />
        <Accessibility className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">Wheelchair accessible only</span>
      </label>
    </div>
  );
}
