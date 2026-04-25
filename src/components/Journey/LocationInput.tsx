"use client";
import { useState, useRef, useEffect } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/transit";

interface LocationInputProps {
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
  onSelect: (result: SearchResult) => void;
  onClear: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function LocationInput({
  value,
  placeholder,
  onChange,
  onSelect,
  onClear,
  icon,
  className,
}: LocationInputProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleChange(val: string) {
    onChange(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-500">
          {icon ?? <MapPin className="w-4 h-4" />}
        </span>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-transit-500 transition-colors"
        />
        <span className="absolute right-3">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
          ) : value ? (
            <button onClick={onClear} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-gray-600" />
          )}
        </span>
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(r); setOpen(false); }}
              >
                <div className="text-white font-medium truncate">{r.name}</div>
                <div className="text-gray-500 text-xs truncate">{r.displayName}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
