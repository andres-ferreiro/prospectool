"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectNameInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProjectNameInput({ value, onChange }: ProjectNameInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="project-name" className="text-foreground/70">
        Nombre del proyecto
      </Label>
      <Input
        id="project-name"
        placeholder="Ej. Restaurantes CDMX, Zona Centro…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border-0 px-4 shadow-sm"
      />
    </div>
  );
}
