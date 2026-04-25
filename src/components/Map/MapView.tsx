"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMapEvents, ZoomControl } from "react-leaflet";
import { useJourneyStore } from "@/store/journeyStore";
import { modeColor } from "@/lib/utils";
import type { Stop, LatLng } from "@/types/transit";
import L from "leaflet";

// Fix default marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const originIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function makeStopIcon(type: Stop["type"]) {
  const colors: Record<Stop["type"], string> = {
    bus_stop: "#f59e0b",
    train_station: "#3b82f6",
    metro_station: "#8b5cf6",
    ferry_terminal: "#06b6d4",
  };
  const color = colors[type] ?? "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;opacity:0.9"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function MapClickHandler() {
  const { setOrigin, setDestination, origin } = useJourneyStore();
  useMapEvents({
    contextmenu(e) {
      const { lat, lng } = e.latlng;
      const name = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (!origin) {
        setOrigin({ name, lat, lng });
      } else {
        setDestination({ name, lat, lng });
      }
    },
  });
  return null;
}

function MapCenterController() {
  const { mapCenter, mapZoom } = useJourneyStore();
  const map = useMapEvents({});
  const prev = useRef<LatLng | null>(null);
  useEffect(() => {
    if (prev.current?.[0] !== mapCenter[0] || prev.current?.[1] !== mapCenter[1]) {
      map.flyTo(mapCenter, mapZoom, { duration: 1 });
      prev.current = mapCenter;
    }
  }, [mapCenter, mapZoom, map]);
  return null;
}

function SelectedRouteLayer() {
  const { selectedJourney } = useJourneyStore();
  if (!selectedJourney) return null;
  return (
    <>
      {selectedJourney.legs.map((leg, i) => {
        const pts = leg.geometry && leg.geometry.length > 1 ? leg.geometry : [
          [leg.from.lat, leg.from.lng] as LatLng,
          [leg.to.lat, leg.to.lng] as LatLng,
        ];
        return (
          <Polyline
            key={i}
            positions={pts}
            pathOptions={{
              color: modeColor(leg.mode),
              weight: leg.mode === "walk" ? 3 : 5,
              opacity: 0.85,
              dashArray: leg.mode === "walk" ? "6 8" : undefined,
            }}
          />
        );
      })}
    </>
  );
}

export default function MapView() {
  const { origin, destination, nearbyStops, mapCenter, mapZoom } = useJourneyStore();

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="w-full h-full"
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <MapClickHandler />
      <MapCenterController />
      <SelectedRouteLayer />

      {/* Nearby stops */}
      {nearbyStops.map((stop) => (
        <CircleMarker
          key={stop.id}
          center={[stop.lat, stop.lng]}
          radius={5}
          pathOptions={{
            color: stop.type === "bus_stop" ? "#f59e0b" : stop.type === "train_station" ? "#3b82f6" : "#8b5cf6",
            fillColor: stop.type === "bus_stop" ? "#f59e0b" : stop.type === "train_station" ? "#3b82f6" : "#8b5cf6",
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm font-medium">{stop.name}</div>
            <div className="text-xs text-gray-500 capitalize">{stop.type.replace("_", " ")}</div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Origin / destination markers */}
      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
          <Popup><strong>From:</strong> {origin.name}</Popup>
        </Marker>
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
          <Popup><strong>To:</strong> {destination.name}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
