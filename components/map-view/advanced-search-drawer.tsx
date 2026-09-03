"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdvancedCategoryTree } from "./advanced-category-tree";
import { SimpleCombobox } from "./simple-combobox";
import { ENTIDADES } from "@/lib/inegi/entidades";
import { MUNICIPIOS } from "@/lib/inegi/municipios";
import { reverseGeocodeToEntidadMunicipio } from "@/lib/geo-mx";
import { SCIAN_CATALOG } from "@/lib/scian/catalog";
import { useIsDesktop } from "@/hooks/use-media-query";

const SCIAN_TITLE_BY_CODE = new Map(SCIAN_CATALOG.map((c) => [c.code, c.title]));

interface AdvancedSearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to guess Estado/Municipio from when the drawer opens (current
   *  map center, or the user's own location) — a starting point only, see
   *  the prefill effect below. */
  mapCenter: { lat: number; lng: number } | null;
  /** Kicks off the (background, streaming) search in business-map.tsx — this
   *  drawer is purely a config UI and closes immediately on submit so the
   *  search can keep running while the user does other things. */
  onSubmit: (codes: string[], entidad: string, municipio: string) => void;
}

// A single category can have thousands of results across a whole municipio
// (see business-map.tsx's comments) — capping how many categories can be
// queried in one run keeps a "select this whole sector" tap from silently
// kicking off a multi-minute background job.
const MAX_CATEGORIES = 25;

// Standalone, precise SCIAN-code search — separate from and never mixed
// into the regular project keyword/pill search. The user explicitly picks
// one or more categories (individually or whole sectors/subsectors at
// once) plus an Estado + Municipio; results don't depend on the map's
// current position or zoom.
export function AdvancedSearchDrawer({ open, onOpenChange, mapCenter, onSubmit }: AdvancedSearchDrawerProps) {
  const [codes, setCodes] = useState<Set<string>>(new Set());
  const [entidad, setEntidad] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [manualCodeError, setManualCodeError] = useState<string | null>(null);
  // A non-blocking heads-up (not an error) for a well-formed code that just
  // isn't in the SCIAN catalog — could be a typo, or a real code the
  // catalog is missing, so it's still added rather than rejected outright.
  const [manualCodeWarning, setManualCodeWarning] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  // Lets a code outside the catalog tree (or one the user already knows by
  // heart) be queried directly — useful for checking whether a given SCIAN
  // class turns up SIEM/DENUE results without having to hunt for its title.
  const addManualCode = () => {
    const code = manualCode.trim();
    setManualCodeWarning(null);
    if (!/^\d{6}$/.test(code)) {
      setManualCodeError("Debe ser un código de 6 dígitos");
      return;
    }
    if (codes.has(code)) {
      setManualCodeError("Ese código ya está en la lista");
      return;
    }
    setCodes((prev) => new Set(prev).add(code));
    setManualCode("");
    setManualCodeError(null);
    if (!SCIAN_TITLE_BY_CODE.has(code)) {
      setManualCodeWarning(
        `No encontramos ${code} en el catálogo SCIAN — se agregó igual, pero revisa que esté bien escrito.`
      );
    }
  };

  const removeCode = (code: string) => {
    setCodes((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  };

  const entidadOptions = useMemo(() => ENTIDADES.map((e) => ({ value: e.code, label: e.name })), []);
  const municipioOptions = useMemo(
    () =>
      MUNICIPIOS.filter((m) => m.entidadCode === entidad).map((m) => ({
        value: m.municipioCode,
        label: m.name,
      })),
    [entidad]
  );

  // Best-effort starting guess for Estado/Municipio from wherever the map
  // is centered when the drawer opens — reverse-geocoded via Mapbox, then
  // fuzzy-matched against the INEGI catalog (names don't always match
  // exactly, e.g. Mapbox's "Coahuila" vs INEGI's "Coahuila de Zaragoza").
  // Only runs once per open, and only if the user hasn't already picked an
  // Estado — never overwrites a manual choice.
  useEffect(() => {
    if (!open || !mapCenter || entidad) return;

    let cancelled = false;
    reverseGeocodeToEntidadMunicipio(mapCenter).then(({ entidad: matchedEntidad, municipio: matchedMunicipio }) => {
      if (cancelled || !matchedEntidad) return;
      setEntidad(matchedEntidad);
      if (matchedMunicipio) setMunicipio(matchedMunicipio);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const overCap = codes.size > MAX_CATEGORIES;
  const canSearch = codes.size > 0 && !overCap && !!entidad && !!municipio;

  const handleSubmit = () => {
    if (!canSearch || !entidad || !municipio) return;
    onSubmit(Array.from(codes), entidad, municipio);
    onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={!isDesktop}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent floating={isDesktop} className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>Búsqueda avanzada</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
          <div className="space-y-2">
            <Label className="text-foreground/70">Código SCIAN manual</Label>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setManualCodeError(null);
                  setManualCodeWarning(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addManualCode();
                  }
                }}
                inputMode="numeric"
                placeholder="Ej. 461110"
                className="h-11 rounded-xl border-0 px-4 shadow-sm"
              />
              <Button type="button" size="icon" className="h-11 w-11 shrink-0" onClick={addManualCode}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {manualCodeError && <p className="text-xs text-destructive">{manualCodeError}</p>}
            {manualCodeWarning && (
              <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {manualCodeWarning}
              </p>
            )}
            <p className="text-xs text-foreground/40">
              Escribe una clase SCIAN de 6 dígitos exacta y agrégala directamente, sin buscarla en el
              catálogo — útil para probar si un código específico trae resultados de SIEM/DENUE.
            </p>
          </div>

          {codes.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(codes).map((code) => {
                const known = SCIAN_TITLE_BY_CODE.has(code);
                return (
                <span
                  key={code}
                  className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
                  title={known ? undefined : "No encontramos este código en el catálogo SCIAN"}
                >
                  {!known && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />}
                  <span className="font-mono">{code}</span>
                  {known && (
                    <span className="max-w-40 truncate text-muted-foreground">
                      {SCIAN_TITLE_BY_CODE.get(code)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeCode(code)}
                    aria-label={`Quitar ${code}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-foreground/70">Categorías (catálogo SCIAN)</Label>
            <AdvancedCategoryTree value={codes} onChange={setCodes} />
            {overCap && (
              <p className="text-xs text-destructive">
                Selecciona como máximo {MAX_CATEGORIES} categorías por búsqueda (tienes {codes.size}). Prueba
                con un subsector en vez de todo el sector.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/70">Estado</Label>
            <SimpleCombobox
              items={entidadOptions}
              value={entidad}
              onChange={(next) => {
                setEntidad(next);
                setMunicipio(null);
              }}
              placeholder="Buscar estado…"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/70">Municipio</Label>
            <SimpleCombobox
              items={municipioOptions}
              value={municipio}
              onChange={setMunicipio}
              placeholder={entidad ? "Buscar municipio…" : "Elige un estado primero"}
              disabled={!entidad}
            />
          </div>

          <p className="text-xs text-foreground/40">
            Busca por categoría exacta del catálogo SCIAN dentro de un municipio específico. Estado
            y municipio se sugieren según dónde está el mapa al abrir esto, pero puedes cambiarlos
            — la búsqueda en sí no depende de tu posición. Corre en segundo plano; puedes seguir
            usando la app mientras tanto.
          </p>
        </div>
        <DrawerFooter>
          <Button size="lg" className="w-full gap-2" onClick={handleSubmit} disabled={!canSearch}>
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
