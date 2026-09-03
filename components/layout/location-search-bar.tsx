"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface LocationSearchBarProps {
  onSelect: (center: { lat: number; lng: number }) => void;
}

export function LocationSearchBar({ onSelect }: LocationSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingFeature[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) return;

    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${token}&country=mx&limit=5`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.features ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (feature: GeocodingFeature) => {
    onSelect({ lat: feature.center[1], lng: feature.center[0] });
    setQuery(feature.place_name);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        <Input
          placeholder="Buscar ciudad o dirección…"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (next.trim().length < 3) {
              setResults([]);
              setOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="h-11 rounded-2xl border-transparent bg-popover pl-11 text-[15px] shadow-soft focus-visible:border-transparent"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-popover shadow-soft">
          {results.map((feature) => (
            <li key={feature.id}>
              <button
                type="button"
                onClick={() => handleSelect(feature)}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors duration-150"
              >
                {feature.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
