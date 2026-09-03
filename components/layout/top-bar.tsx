"use client";

import { MapPin } from "lucide-react";
import { ProjectSwitcher } from "./project-switcher";
import { AvatarMenu } from "./avatar-menu";
import type { ProjectRow } from "@/lib/db/types";
import type { CurrentUser } from "@/hooks/use-user";

interface TopBarProps {
  projects: ProjectRow[];
  activeProject: ProjectRow | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onEditProject: () => void;
  user?: CurrentUser | null;
}

// Fixed app chrome — persists across routes (map/CRM) so switching projects
// doesn't depend on which view you're on. See BottomNav for navigating
// between those views. A soft gradient (no hard edge/box) keeps it reading
// as an overlay on the map rather than a separate panel.
export function TopBar({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onEditProject,
  user,
}: TopBarProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-background/95 via-background/50 to-transparent">
      <div className="flex h-14 items-center px-4">
        <div className="flex shrink-0 items-center text-foreground/60">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        {user && (
          <div className="pointer-events-auto ml-auto">
            <AvatarMenu user={user} />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-14 items-center justify-center px-16">
        {activeProject ? (
          <div className="pointer-events-auto">
            <ProjectSwitcher
              projects={projects}
              activeProject={activeProject}
              onSelect={onSelectProject}
              onCreateNew={onCreateProject}
              onEdit={onEditProject}
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sin proyecto</span>
        )}
      </div>
    </header>
  );
}
