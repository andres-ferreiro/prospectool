"use client";

import { useEffect, useState } from "react";

function formatDate(d: Date) {
  const raw = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// Ticks every second so the displayed minute is never stale by more than a
// moment, without doing anything expensive per tick (just a Date re-render).
export function CalendarClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const initial = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex flex-col">
      <span className="font-heading text-6xl font-thin tabular-nums leading-none text-foreground">
        {now ? now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
      </span>
      <span className="mt-1.5 text-sm text-muted-foreground">{now ? formatDate(now) : ""}</span>
    </div>
  );
}
