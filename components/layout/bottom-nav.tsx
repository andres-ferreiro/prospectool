"use client";

import Link from "next/link";
import { CalendarDays, Lock, Map as MapIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { openPaywall } from "@/lib/paywall";

export type BottomNavTab = "map" | "crm" | "calendar";

interface BottomNavProps {
  projectId: string;
  active: BottomNavTab;
  /** Defaults to true: CrmPage only ever renders past its own server-side
   *  paywall redirect, so its own nav never needs to show the CRM tab as
   *  locked — only AppShell's map-page nav, where unpaid users legitimately
   *  are, passes this explicitly. */
  isPaid?: boolean;
}

const TABS: { key: BottomNavTab; label: string; icon: typeof MapIcon; href: (id: string) => string }[] = [
  { key: "map", label: "Mapa", icon: MapIcon, href: (id) => `/proyectos/${id}` },
  { key: "crm", label: "CRM", icon: Users, href: (id) => `/proyectos/${id}/crm` },
  { key: "calendar", label: "Agenda", icon: CalendarDays, href: (id) => `/proyectos/${id}/calendario` },
];

const tabClassName = (isActive: boolean) =>
  cn(
    "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 ease-in-out",
    isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground"
  );

// Fixed app chrome for the map and CRM views — mirrors the floating,
// pill-shaped style already used by ProjectSwitcher/TopBar. Saved places
// live on the map itself (see the floating CRM-overview toggle), not here.
export function BottomNav({ projectId, active, isPaid = true }: BottomNavProps) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-6">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-popover/95 p-1.5 shadow-soft backdrop-blur">
        {TABS.map(({ key, label, icon: Icon, href }) => {
          const isActive = key === active;
          const isLocked = (key === "crm" || key === "calendar") && !isPaid;

          // Locked opens the paywall modal in place instead of navigating —
          // there's nothing to navigate to yet.
          if (isLocked) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => openPaywall(key === "crm" ? "crm" : "calendario")}
                className={tabClassName(isActive)}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <Lock className="h-3 w-3 shrink-0" aria-hidden />
              </button>
            );
          }

          return (
            <Link key={key} href={href(projectId)} className={tabClassName(isActive)}>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
