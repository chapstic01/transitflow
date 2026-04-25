"use client";
import { Clock, Coins, Footprints, Leaf, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn, formatDuration, formatCost, formatDistance, formatTime, modeColor, modeEmoji } from "@/lib/utils";
import { Badge } from "@/components/UI/Badge";
import type { Journey } from "@/types/transit";

interface RouteCardProps {
  journey: Journey;
  selected: boolean;
  rank: number;
  onSelect: () => void;
}

export function RouteCard({ journey, selected, rank, onSelect }: RouteCardProps) {
  const [expanded, setExpanded] = useState(false);

  const rankLabel = rank === 0 ? "Best" : rank === 1 ? "2nd" : "3rd";
  const rankColor = rank === 0 ? "bg-emerald-600" : rank === 1 ? "bg-transit-600" : "bg-gray-600";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all cursor-pointer",
        selected
          ? "border-transit-500 bg-gray-800 shadow-lg shadow-transit-900/30"
          : "border-gray-700 bg-gray-850 hover:border-gray-600 hover:bg-gray-800"
      )}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full text-white", rankColor)}>
              {journey.label || rankLabel}
            </span>
            <div className="flex gap-1">
              {journey.legs.map((leg, i) => (
                <span key={i} className="text-base" title={leg.mode}>
                  {modeEmoji(leg.mode)}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{formatCost(journey.totalCost)}</div>
            <div className="text-xs text-gray-400">
              {formatTime(journey.departureTime)} → {formatTime(journey.arrivalTime)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-300">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            {formatDuration(journey.totalDurationMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5 text-gray-500" />
            {formatDistance(journey.totalWalkingMeters)} walk
          </span>
          {journey.co2Grams !== undefined && (
            <span className="flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-emerald-500" />
              {Math.round(journey.co2Grams)}g CO₂
            </span>
          )}
        </div>

        {/* Mode timeline */}
        <div className="mt-3 flex items-center gap-1">
          {journey.legs.map((leg, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full flex-1 min-w-[8px]"
              style={{ backgroundColor: modeColor(leg.mode) }}
              title={`${leg.mode}: ${formatDuration(leg.durationMinutes)}`}
            />
          ))}
        </div>
      </div>

      {/* Expand button */}
      <button
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-300 border-t border-gray-700 transition-colors"
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      >
        {expanded ? <><ChevronUp className="w-3 h-3" /> Hide steps</> : <><ChevronDown className="w-3 h-3" /> Show steps</>}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {journey.legs.map((leg, i) => (
            <div key={i} className="flex gap-3">
              <div
                className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: modeColor(leg.mode) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Badge color={modeColor(leg.mode)}>
                    {modeEmoji(leg.mode)} {leg.lineName || leg.mode}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatTime(leg.departureTime)} → {formatTime(leg.arrivalTime)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {leg.from.name} → {leg.to.name}
                </p>
                {leg.direction && (
                  <p className="text-xs text-gray-500">Direction: {leg.direction}</p>
                )}
                {leg.cost !== undefined && leg.cost > 0 && (
                  <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                    <Coins className="w-3 h-3" /> {formatCost(leg.cost)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
