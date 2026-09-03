"use client";

import Link from "next/link";
import { Map as MapIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavTab = "map" | "crm";

interface BottomNavProps {
  projectId: string;
  active: BottomNavTab;
}

const TABS: { key: BottomNavTab; label: string; icon: typeof MapIcon; href: (id: string) => string }[] = [
  { key: "map", label: "Mapa", icon: MapIcon, href: (id) => `/proyectos/${id}` },
  { key: "crm", label: "CRM", icon: Users, href: (id) => `/proyectos/${id}/crm` },
];

// Fixed app chrome for the map and CRM views — mirrors the floating,
// pill-shaped style already used by ProjectSwitcher/TopBar. Saved places
// live on the map itself (see the floating CRM-overview toggle), not here.
export function BottomNav({ projectId, active }: BottomNavProps) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-6">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-popover/95 p-1.5 shadow-soft backdrop-blur">
        {TABS.map(({ key, label, icon: Icon, href }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={href(projectId)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 ease-in-out",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
