import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Location,
  Journey,
  TransportPreferences,
  Stop,
  LatLng,
} from "@/types/transit";

interface JourneyState {
  origin: Location | null;
  destination: Location | null;
  journeys: Journey[];
  selectedJourney: Journey | null;
  nearbyStops: Stop[];
  mapCenter: LatLng;
  mapZoom: number;
  loading: boolean;
  error: string | null;
  preferences: TransportPreferences;
  departureTime: string;
  isPremium: boolean;

  setOrigin: (loc: Location | null) => void;
  setDestination: (loc: Location | null) => void;
  setJourneys: (journeys: Journey[]) => void;
  selectJourney: (journey: Journey | null) => void;
  setNearbyStops: (stops: Stop[]) => void;
  setMapCenter: (center: LatLng, zoom?: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePreferences: (prefs: Partial<TransportPreferences>) => void;
  setDepartureTime: (time: string) => void;
  swapLocations: () => void;
  reset: () => void;
}

const defaultPreferences: TransportPreferences = {
  modes: ["bus", "train", "walk"],
  maxWalkingMinutes: 15,
  optimize: "cheapest",
  wheelchairAccessible: false,
  avoidStairs: false,
};

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      origin: null,
      destination: null,
      journeys: [],
      selectedJourney: null,
      nearbyStops: [],
      mapCenter: [51.505, -0.09],
      mapZoom: 13,
      loading: false,
      error: null,
      preferences: defaultPreferences,
      departureTime: "",
      isPremium: false,

      setOrigin: (loc) => set({ origin: loc, journeys: [], selectedJourney: null }),
      setDestination: (loc) => set({ destination: loc, journeys: [], selectedJourney: null }),
      setJourneys: (journeys) => set({ journeys }),
      selectJourney: (journey) => set({ selectedJourney: journey }),
      setNearbyStops: (stops) => set({ nearbyStops: stops }),
      setMapCenter: (center, zoom) =>
        set({ mapCenter: center, ...(zoom !== undefined && { mapZoom: zoom }) }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      updatePreferences: (prefs) =>
        set({ preferences: { ...get().preferences, ...prefs } }),
      setDepartureTime: (time) => set({ departureTime: time }),
      swapLocations: () =>
        set({ origin: get().destination, destination: get().origin, journeys: [], selectedJourney: null }),
      reset: () =>
        set({
          origin: null,
          destination: null,
          journeys: [],
          selectedJourney: null,
          error: null,
        }),
    }),
    {
      name: "transitflow-journey",
      partialize: (state) => ({ preferences: state.preferences, isPremium: state.isPremium }),
    }
  )
);
