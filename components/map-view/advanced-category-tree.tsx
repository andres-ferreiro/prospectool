"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { Check, ChevronDown, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { SCIAN_TREE, normalizeSpanish } from "@/lib/scian/groups";

interface AdvancedCategoryTreeProps {
  value: Set<string>;
  onChange: (value: Set<string>) => void;
}

type CheckState = "none" | "some" | "all";

function checkState(codes: string[], selected: Set<string>): CheckState {
  const n = codes.filter((c) => selected.has(c)).length;
  if (n === 0) return "none";
  return n === codes.length ? "all" : "some";
}

// Wraps the part of `title` that matched `query` in a <mark>. Finds the
// match on the accent/case-insensitive normalized string but slices the
// *original* string at the same offsets, so the highlighted text keeps its
// real accents/casing — normalizeSpanish only strips diacritics and
// lowercases, both length-preserving, so the offsets line up.
function highlightMatch(title: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return title;
  const normTitle = normalizeSpanish(title);
  const normQuery = normalizeSpanish(q);
  const idx = normTitle.indexOf(normQuery);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <mark className="rounded-none bg-transparent font-semibold text-primary">
        {title.slice(idx, idx + normQuery.length)}
      </mark>
      {title.slice(idx + normQuery.length)}
    </>
  );
}

// A purely visual checkbox — the click target is always the surrounding
// button (see below), never this element itself, so it never nests a
// <button> inside another <button>.
function CheckVisual({ state }: { state: CheckState }) {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
      style={{
        backgroundColor: state !== "none" ? "var(--color-primary)" : "transparent",
        borderColor: state !== "none" ? "transparent" : "var(--color-input)",
      }}
      aria-hidden
    >
      {state === "all" && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      {state === "some" && <Minus className="h-3 w-3 text-white" strokeWidth={3} />}
    </span>
  );
}

// Sector → Subsector → Clase, expandable and searchable, with multi-select
// at every level (checking a Sector or Subsector selects/deselects every
// Clase beneath it; individual Clases can also be toggled one by one).
// The checkbox and the expand/collapse trigger are rendered as sibling
// buttons (not nested) inside the accordion header row, since a <button>
// can't validly contain another <button>.
export function AdvancedCategoryTree({ value, onChange }: AdvancedCategoryTreeProps) {
  const [query, setQuery] = useState("");
  // Which sectors/subsectors are expanded — controlled so a search can
  // force everything with a match open instead of the user having to
  // expand each one by hand to see filtered results. Subsector keys are
  // namespaced by their sector ("sector::subsector") since two different
  // sectors could otherwise collide on the same subsector name.
  const [openSectors, setOpenSectors] = useState<string[]>([]);
  const [openSubsectors, setOpenSubsectors] = useState<string[]>([]);

  const toggleCodes = (codes: string[], select: boolean) => {
    const next = new Set(value);
    for (const c of codes) {
      if (select) next.add(c);
      else next.delete(c);
    }
    onChange(next);
  };

  const toggleOne = (code: string) => {
    const next = new Set(value);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
  };

  const filteredTree = useMemo(() => {
    const q = normalizeSpanish(query.trim());
    if (!q) return SCIAN_TREE;
    return SCIAN_TREE.map((sector) => ({
      ...sector,
      subsectors: sector.subsectors
        .map((sub) => ({
          ...sub,
          clases: sub.clases.filter((c) => normalizeSpanish(c.title).includes(q)),
        }))
        .filter((sub) => sub.clases.length > 0),
    })).filter((sector) => sector.subsectors.length > 0);
  }, [query]);

  // Force everything with a match open as soon as the query changes,
  // rather than making the user expand each sector/subsector by hand to
  // see filtered results — adjusted during render (React's documented
  // pattern for this) so it takes effect the same render filteredTree
  // does, instead of flashing the old (collapsed) state first.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    if (query.trim()) {
      setOpenSectors(filteredTree.map((sector) => sector.sector));
      setOpenSubsectors(
        filteredTree.flatMap((sector) => sector.subsectors.map((sub) => `${sector.sector}::${sub.subsector}`))
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar categoría SCIAN…"
        className="h-11 rounded-xl border-0 px-4 shadow-sm"
      />

      {value.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.size} categoría{value.size === 1 ? "" : "s"} seleccionada{value.size === 1 ? "" : "s"}
        </p>
      )}

      <div className="max-h-80 min-w-0 overflow-x-hidden overflow-y-auto rounded-xl border border-border/50 bg-popover px-2">
        {filteredTree.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Sin resultados en el catálogo SCIAN.</p>
        ) : (
          <Accordion multiple value={openSectors} onValueChange={setOpenSectors}>
            {filteredTree.map((sector) => {
              const sectorCodes = sector.subsectors.flatMap((s) => s.clases.map((c) => c.code));
              const sectorState = checkState(sectorCodes, value);
              return (
                <AccordionItem key={sector.sector} value={sector.sector} className="min-w-0">
                  <AccordionPrimitive.Header className="flex min-w-0 items-start gap-1">
                    <button
                      type="button"
                      onClick={() => toggleCodes(sectorCodes, sectorState !== "all")}
                      aria-label={`Seleccionar todo en ${sector.sector}`}
                      className="flex h-9 shrink-0 items-center px-1"
                    >
                      <CheckVisual state={sectorState} />
                    </button>
                    <AccordionPrimitive.Trigger className="flex min-w-0 flex-1 items-start justify-between gap-2 py-2 text-left text-sm font-medium outline-none [&[data-panel-open]>svg]:rotate-180">
                      <span className="min-w-0 flex-1 break-words">{highlightMatch(sector.sector, query)}</span>
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionPrimitive.Panel className="min-w-0 overflow-hidden pl-4 data-ending-style:h-0 data-starting-style:h-0">
                    <Accordion
                      multiple
                      value={openSubsectors.filter((k) => k.startsWith(`${sector.sector}::`))}
                      onValueChange={(vals: string[]) => {
                        setOpenSubsectors((prev) => [
                          ...prev.filter((k) => !k.startsWith(`${sector.sector}::`)),
                          ...vals,
                        ]);
                      }}
                    >
                      {sector.subsectors.map((sub) => {
                        const subCodes = sub.clases.map((c) => c.code);
                        const subState = checkState(subCodes, value);
                        const subKey = `${sector.sector}::${sub.subsector}`;
                        return (
                          <AccordionItem key={subKey} value={subKey} className="min-w-0">
                            <AccordionPrimitive.Header className="flex min-w-0 items-start gap-1">
                              <button
                                type="button"
                                onClick={() => toggleCodes(subCodes, subState !== "all")}
                                aria-label={`Seleccionar todo en ${sub.subsector}`}
                                className="flex h-8 shrink-0 items-center px-1"
                              >
                                <CheckVisual state={subState} />
                              </button>
                              <AccordionPrimitive.Trigger className="flex min-w-0 flex-1 items-start justify-between gap-2 py-1.5 text-left text-sm outline-none [&[data-panel-open]>svg]:rotate-180">
                                <span className="min-w-0 flex-1 break-words">
                                  {highlightMatch(sub.subsector, query)}
                                </span>
                                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200" />
                              </AccordionPrimitive.Trigger>
                            </AccordionPrimitive.Header>
                            <AccordionPrimitive.Panel className="min-w-0 overflow-hidden pl-4 data-ending-style:h-0 data-starting-style:h-0">
                              <div className="flex min-w-0 flex-col gap-0.5 pb-2">
                                {sub.clases.map((clase) => (
                                  <button
                                    key={clase.code}
                                    type="button"
                                    onClick={() => toggleOne(clase.code)}
                                    className="flex min-w-0 items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                                  >
                                    <span className="flex h-5 shrink-0 items-center">
                                      <CheckVisual state={value.has(clase.code) ? "all" : "none"} />
                                    </span>
                                    <span className="min-w-0 flex-1 break-words">
                                      {highlightMatch(clase.title, query)}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </AccordionPrimitive.Panel>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </AccordionPrimitive.Panel>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
