"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SimpleCombobox } from "@/components/map-view/simple-combobox";
import { ENTIDADES } from "@/lib/inegi/entidades";
import { MUNICIPIOS } from "@/lib/inegi/municipios";
import { reverseGeocodeToEntidadMunicipio } from "@/lib/geo-mx";
import { useIsDesktop } from "@/hooks/use-media-query";

interface LocationStepOverlayProps {
  open: boolean;
  onResolved: (entidad: string, municipio: string) => void;
  onSkip: () => void;
}

export function LocationStepOverlay({ open, onResolved, onSkip }: LocationStepOverlayProps) {
  const isDesktop = useIsDesktop();
  const [entidad, setEntidad] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
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

  const handleShareLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateError("Tu navegador no soporta ubicación. Elige tu estado y municipio.");
      return;
    }

    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        reverseGeocodeToEntidadMunicipio({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).then(({ entidad: matchedEntidad, municipio: matchedMunicipio }) => {
          setLocating(false);
          if (matchedEntidad && matchedMunicipio) {
            onResolved(matchedEntidad, matchedMunicipio);
            return;
          }
          setEntidad(matchedEntidad);
          setLocateError("No pudimos identificar tu municipio exacto. Confírmalo abajo.");
        });
      },
      () => {
        setLocating(false);
        setLocateError("No pudimos acceder a tu ubicación. Elige tu estado y municipio.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const canContinue = !!entidad && !!municipio;

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <Button size="lg" className="w-full gap-2" onClick={handleShareLocation} disabled={locating}>
        <MapPin className="h-4 w-4" />
        {locating ? "Ubicando…" : "Compartir mi ubicación"}
      </Button>
      {locateError && <p className="text-xs text-destructive">{locateError}</p>}

      <div className="flex items-center gap-2 text-xs text-foreground/40">
        <div className="h-px flex-1 bg-border" />o elige manualmente
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

      <Button
        size="lg"
        variant="outline"
        className="w-full"
        onClick={() => canContinue && onResolved(entidad!, municipio!)}
        disabled={!canContinue}
      >
        Continuar
      </Button>

      <button
        type="button"
        onClick={onSkip}
        className="text-center text-sm text-foreground/50 underline-offset-2 hover:underline"
      >
        Buscar solo con palabras clave por ahora
      </button>
    </div>
  );

  const title = "¿Dónde buscamos?";
  // Dismissal (backdrop/Esc) behaves exactly like the explicit skip link —
  // this step never hard-blocks the user from reaching the map.
  const handleOpenChange = (next: boolean) => !next && onSkip();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
      <DrawerContent className="bg-sheet">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
