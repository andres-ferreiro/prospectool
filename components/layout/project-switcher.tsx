"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import type { ProjectRow } from "@/lib/db/types";

interface ProjectSwitcherProps {
  projects: ProjectRow[];
  activeProject: ProjectRow;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onEdit: () => void;
}

export function ProjectSwitcher({
  projects,
  activeProject,
  onSelect,
  onCreateNew,
  onEdit,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-base font-semibold text-foreground transition-colors duration-150 ease-in-out hover:bg-muted"
      >
        <span className="max-w-[55vw] truncate">{activeProject.product_service}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground/50 transition-transform duration-200 ease-in-out ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} aria-hidden />
          <ul className="absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 overflow-hidden rounded-xl bg-popover shadow-soft">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(p.id);
                  }}
                  className={`block w-full truncate px-4 py-2.5 text-left text-sm transition-colors duration-150 ease-in-out hover:bg-muted ${
                    p.id === activeProject.id ? "font-medium text-primary" : ""
                  }`}
                >
                  {p.product_service}
                </button>
              </li>
            ))}
            <li className="border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-150 ease-in-out hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />
                Editar proyecto
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-primary transition-colors duration-150 ease-in-out hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                Nuevo proyecto
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
