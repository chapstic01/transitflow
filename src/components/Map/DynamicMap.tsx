"use client";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/UI/Spinner";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Spinner className="w-8 h-8" />
        <span className="text-sm">Loading map…</span>
      </div>
    </div>
  ),
});

export default MapView;
export { MapView as DynamicMap };
