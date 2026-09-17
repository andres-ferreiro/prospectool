"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SimpleCombobox } from "@/components/map-view/simple-combobox";
import { ENTIDADES } from "@/lib/inegi/entidades";
import { MUNICIPIOS } from "@/lib/inegi/municipios";
import { geocodeEntidadMunicipio, reverseGeocodeToEntidadMunicipio } from "@/lib/geo-mx";
import { requestCurrentLocation } from "@/hooks/use-current-location";
import { useIsDesktop } from "@/hooks/use-media-query";

export interface ResolvedSearchLocation {
  center: { lat: number; lng: number };
  entidad: string | null;
  municipio: string | null;
}

interface LocationStepOverlayProps {
  open: boolean;
  onResolved: (location: ResolvedSearchLocation) => void;
  onSkip: () => void;
}

export function LocationStepOverlay({ open, onResolved, onSkip }: LocationStepOverlayProps) {
  const isDesktop = useIsDesktop();
  const [entidad, setEntidad] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [busy, setBusy] = useState<"gps" | "manual" | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);

  const entidadOptions = useMemo(() => ENTIDADES.map((e) => ({ value: e.code, label: e.name })), []);
  const municipioOptions = useMemo(
    () =>
      MUNICIPIOS.filter((m) => m.entidadCode === entidad).map((m) => ({
        value: m.municipioCode,
        label: m.name,
      })),
    [entidad]
  );

  const handleShareLocation = async () => {
    setBusy("gps");
    setLocateError(null);
    // Shared with the map's own location store, so granting here is the
    // only prompt the user ever sees, and the map's dot picks it up too.
    const coords = await requestCurrentLocation();
    if (!coords) {
      setBusy(null);
      setLocateError(
        "No pudimos acceder a tu ubicación. Si bloqueaste el permiso, actívalo en tu navegador o elige tu estado y municipio."
      );
      return;
    }

    const matched = await reverseGeocodeToEntidadMunicipio(coords);
    setBusy(null);
    // The GPS coordinates alone are enough for the keyword search — the
    // municipio match only matters for category (SCIAN) search, which
    // BusinessMap skips when it's missing.
    onResolved({ center: coords, entidad: matched.entidad, municipio: matched.municipio });
  };

  const handleContinue = async () => {
    if (!entidad || !municipio) return;
    setBusy("manual");
    setLocateError(null);
    const center = await geocodeEntidadMunicipio(entidad, municipio);
    setBusy(null);
    if (!center) {
      setLocateError("No pudimos ubicar ese municipio en el mapa. Intenta de nuevo.");
      return;
    }
    onResolved({ center, entidad, municipio });
  };

  const canContinue = !!entidad && !!municipio && busy === null;

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Button size="lg" className="w-full gap-2" onClick={handleShareLocation} disabled={busy !== null}>
        <MapPin className="h-4 w-4" />
        {busy === "gps" ? "Ubicando…" : "Usar mi ubicación actual"}
      </Button>
      {locateError && <p className="text-xs text-destructive">{locateError}</p>}

      <div className="flex items-center gap-2 text-xs text-foreground/40">
        <div className="h-px flex-1 bg-border" />o elige una zona
        <div className="h-px flex-1 bg-border" />
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

      <Button size="lg" variant="outline" className="w-full" onClick={handleContinue} disabled={!canContinue}>
        {busy === "manual" ? "Buscando zona…" : "Buscar en esta zona"}
      </Button>

      <button
        type="button"
        onClick={onSkip}
        className="text-center text-sm text-foreground/50 underline-offset-2 hover:underline"
      >
        Ahora no, explorar el mapa
      </button>
    </div>
  );

  const title = "¿Dónde buscamos prospectos?";
  const description = "Elige la zona para este proyecto. Puedes cambiarla después desde la barra de búsqueda del mapa.";
  // Dismissal (backdrop/Esc) behaves exactly like the explicit skip link —
  // this step never hard-blocks the user from reaching the map.
  const handleOpenChange = (next: boolean) => !next && busy === null && onSkip();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
