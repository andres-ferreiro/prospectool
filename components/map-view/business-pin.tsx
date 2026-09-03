import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessPinProps {
  /** CSS color for the pin fill. Defaults to the primary brand color. */
  color?: string;
  /** Selected from the results list/detail view — pulses a ring and pops
   *  the pin slightly so the user can spot it on the map at a glance. */
  selected?: boolean;
  name?: string;
  /** Show the name label. Driven by the map's current zoom (see
   *  business-map.tsx) rather than a device/hover check — with hundreds of
   *  pins on screen at once, showing every name permanently would bury the
   *  map, but once zoomed in enough that pins are naturally spread out,
   *  labels stop being clutter and start being useful, on both mobile and
   *  desktop. Always shown for the selected pin regardless of zoom. */
  showLabel?: boolean;
}

export function BusinessPin({ color, selected, name, showLabel }: BusinessPinProps) {
  const fill = color ?? "var(--color-primary)";

  return (
    <div className="relative flex h-7 w-7 items-center justify-center drop-shadow-md">
      {selected && (
        <span
          className="absolute inline-flex h-9 w-9 animate-ping rounded-full opacity-60"
          style={{ backgroundColor: fill }}
          aria-hidden
        />
      )}
      <MapPin
        className={cn("relative h-7 w-7 text-white transition-transform duration-300", selected && "scale-125")}
        style={{ fill }}
        strokeWidth={1.5}
      />
      {name && (showLabel || selected) && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 max-w-32 -translate-x-1/2 truncate rounded-full bg-popover/95 px-2 py-0.5 text-xs font-medium text-foreground shadow-soft backdrop-blur">
          {name}
        </span>
      )}
    </div>
  );
}
