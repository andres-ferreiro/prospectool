"use client";

import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { QUICK_PICK_KEYWORDS } from "@/lib/scian/quick-picks";

interface KeywordPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

// Tap-to-select pills for the niches most people are looking for, so
// picking "restaurantes" never requires typing. Precision beyond these
// (an exact SCIAN code) is Advanced Search's job (see
// advanced-search-drawer.tsx) — deliberately not duplicated here.
export function KeywordPicker({ value, onChange }: KeywordPickerProps) {
  const togglePick = (term: string) => {
    if (value.includes(term)) onChange(value.filter((v) => v !== term));
    else onChange([...value, term]);
  };

  const removeTerm = (term: string) => onChange(value.filter((v) => v !== term));

  // Existing projects can have keywords from before the catalog search was
  // removed (or a raw free-text term) that aren't one of the quick-pick
  // pills — still needs to be visible and removable here.
  const extra = value.filter((v) => !QUICK_PICK_KEYWORDS.includes(v));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-foreground/70">¿Qué tipo de negocios buscas?</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_PICK_KEYWORDS.map((term) => {
            const selected = value.includes(term);
            return (
              <button
                key={term}
                type="button"
                onClick={() => togglePick(term)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 ease-in-out",
                  selected
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-transparent bg-background text-foreground shadow-sm hover:bg-muted dark:bg-input"
                )}
              >
                {term}
              </button>
            );
          })}
        </div>
      </div>

      {extra.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extra.map((term) => (
            <span
              key={term}
              className="flex max-w-full items-center gap-1 rounded-full bg-secondary py-1 pr-1.5 pl-2.5 text-sm text-secondary-foreground"
            >
              <span className="truncate">{term}</span>
              <button
                type="button"
                onClick={() => removeTerm(term)}
                aria-label={`Quitar ${term}`}
                className="shrink-0 rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
