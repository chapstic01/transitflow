export type LatLng = [number, number];

export type TransportMode = "bus" | "train" | "metro" | "walk" | "ferry" | "mixed";

export interface Location {
  name: string;
  lat: number;
  lng: number;
  type?: "address" | "stop" | "station" | "poi";
}

export interface TransportPreferences {
  modes: TransportMode[];
  maxWalkingMinutes: number;
  optimize: "cheapest" | "fastest" | "fewest_changes";
  wheelchairAccessible: boolean;
  avoidStairs: boolean;
}

export interface JourneyLeg {
  mode: TransportMode;
  from: Location;
  to: Location;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  distanceMeters: number;
  lineName?: string;
  lineColor?: string;
  direction?: string;
  stops?: Location[];
  geometry?: LatLng[];
  cost?: number;
  instructions?: string[];
}

export interface Journey {
  id: string;
  legs: JourneyLeg[];
  totalDurationMinutes: number;
  totalCost: number;
  totalWalkingMeters: number;
  departureTime: string;
  arrivalTime: string;
  co2Grams?: number;
  label?: string;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "bus_stop" | "train_station" | "metro_station" | "ferry_terminal";
  lines?: string[];
  wheelchair?: boolean;
}

export interface SearchResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  importance: number;
}

export interface PremiumFeatures {
  offlineMaps: boolean;
  realTimeAlerts: boolean;
  savedJourneys: boolean;
  noAds: boolean;
}
