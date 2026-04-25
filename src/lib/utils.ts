import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TransportMode } from "@/types/transit";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatCost(gbp: number): string {
  if (gbp === 0) return "Free";
  return `£${gbp.toFixed(2)}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function modeColor(mode: TransportMode): string {
  const colors: Record<TransportMode, string> = {
    bus: "#f59e0b",
    train: "#3b82f6",
    metro: "#8b5cf6",
    walk: "#10b981",
    ferry: "#06b6d4",
    mixed: "#6b7280",
  };
  return colors[mode] ?? "#6b7280";
}

export function modeLabel(mode: TransportMode): string {
  const labels: Record<TransportMode, string> = {
    bus: "Bus",
    train: "Train",
    metro: "Metro",
    walk: "Walk",
    ferry: "Ferry",
    mixed: "Mixed",
  };
  return labels[mode] ?? mode;
}

export function modeEmoji(mode: TransportMode): string {
  const em: Record<TransportMode, string> = {
    bus: "🚌",
    train: "🚆",
    metro: "🚇",
    walk: "🚶",
    ferry: "⛴️",
    mixed: "🗺️",
  };
  return em[mode] ?? "🚌";
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
