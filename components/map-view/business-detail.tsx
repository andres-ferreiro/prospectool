import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Search,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeadDetailContent } from "@/components/crm/lead-detail-content";
import { AppointmentDrawer } from "@/components/calendar/appointment-drawer";
import type { AppointmentRow, BusinessRow, LeadRow } from "@/lib/db/types";
import type { SiemRow } from "@/lib/siem/types";
import { getBusinessMeta } from "@/lib/business-meta";
import { toTitleCase } from "@/lib/text";
import { toast } from "@/lib/toast";
import { timeLabel } from "@/lib/calendar/format";

interface BusinessDetailProps {
  business: BusinessRow;
  projectId: string;
  userLocation?: { lat: number; lng: number };
  onBack: () => void;
  lead: LeadRow | null;
  saved: boolean;
  onMarkVisited: (business: BusinessRow) => Promise<void>;
  onToggleSave: (business: BusinessRow) => Promise<void>;
  onLeadUpdated: (lead: LeadRow) => void;
  onBusinessUpdated: (business: BusinessRow) => void;
  /** Cached/deduped SIEM match lookup — BusinessMap prefetches this in the
   *  background for unlocked results as soon as a search loads, so this
   *  usually resolves instantly instead of waiting on the match query. */
  fetchSiemMatches: (businessId: string) => Promise<SiemRow[] | null>;
}

export function BusinessDetail({
  business,
  projectId,
  userLocation,
  onBack,
  lead,
  saved,
  onMarkVisited,
  onToggleSave,
  onLeadUpdated,
  onBusinessUpdated,
  fetchSiemMatches,
}: BusinessDetailProps) {
  const [markingVisited, setMarkingVisited] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [siemMatch, setSiemMatch] = useState<SiemRow | null>(null);
  const [applyingSiemField, setApplyingSiemField] = useState<"phone" | "email" | null>(null);
  const [nextAppointment, setNextAppointment] = useState<AppointmentRow | null>(null);
  const [appointmentDrawerTarget, setAppointmentDrawerTarget] = useState<"new" | string | null>(null);

  useEffect(() => {
    // Skipped once a lead exists — LeadDetailContent (rendered instead,
    // below) already fetches this by lead_id.
    if (lead) return;
    let cancelled = false;
    fetch(`/api/businesses/${business.id}/next-appointment`)
      .then((res) => res.json())
      .then((data: { appointment: AppointmentRow | null }) => {
        if (!cancelled) setNextAppointment(data.appointment);
      })
      .catch(() => {
        // Best-effort only — the drawer works fine without it.
      });
    return () => {
      cancelled = true;
    };
  }, [business.id, lead]);

  // Only worth asking when DENUE is missing something SIEM tends to have —
  // and only for DENUE businesses to begin with (a SIEM-sourced business
  // matching against itself would be a no-op).
  const missingPhone = !business.phone;
  const missingEmail = !business.email;
  useEffect(() => {
    setSiemMatch(null);
    if (business.source !== "denue" || (!missingPhone && !missingEmail)) return;

    let cancelled = false;
    fetchSiemMatches(business.id)
      .then((matches) => {
        if (cancelled || !matches) return;
        const useful = matches.find(
          (m) => (missingPhone && m.telefono) || (missingEmail && m.e_mail)
        );
        setSiemMatch(useful ?? null);
      })
      .catch(() => {
        // Best-effort only — the drawer works fine without it.
      });

    return () => {
      cancelled = true;
    };
  }, [business.id, business.source, missingPhone, missingEmail, fetchSiemMatches]);

  // Whether this suggestion came from an exact phone/email match (high
  // confidence) or the fuzzy name+municipio fallback (lower confidence,
  // similarity > 0.4 — loose enough that a wrong business nearby with a
  // similar name can surface) — shown so the user can judge for themselves
  // before applying it, rather than presenting every match the same way.
  const siemMatchIsExact =
    !!siemMatch &&
    ((!!business.phone && siemMatch.telefono === business.phone) ||
      (!!business.email && siemMatch.e_mail?.toLowerCase() === business.email.toLowerCase()));

  const applySiemField = async (field: "phone" | "email", value: string) => {
    setApplyingSiemField(field);
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      onBusinessUpdated(data.business as BusinessRow);
      toast({ title: "Dato actualizado", variant: "success" });
    } catch (err) {
      console.error("Error al aplicar dato de SIEM:", err);
      toast({ title: "No se pudo actualizar el dato", variant: "error" });
    } finally {
      setApplyingSiemField(null);
    }
  };

  // Once a business has a lead, this drawer becomes the CRM form (stage,
  // contacts, notes, timeline) — it already shows the business's contact
  // info too, so there's no separate read-only view or a second drawer to
  // open to see/edit CRM data.
  if (lead) {
    return (
      <LeadDetailContent
        leadId={lead.id}
        onUpdated={onLeadUpdated}
        onBack={onBack}
        saved={saved}
        onToggleSave={() => onToggleSave(business)}
        userLocation={userLocation}
      />
    );
  }

  const hasContactInfo = business.address || business.phone || business.email || business.website;
  const meta = getBusinessMeta(business);

  const handleMarkVisited = async () => {
    setMarkingVisited(true);
    try {
      await onMarkVisited(business);
      toast({ title: "Agregado a tu CRM", variant: "success" });
    } catch (err) {
      console.error("Error al marcar como visitado:", err);
      toast({ title: "No se pudo marcar como visitado", variant: "error" });
    } finally {
      setMarkingVisited(false);
    }
  };

  const handleToggleSave = async () => {
    setSavingToggle(true);
    try {
      await onToggleSave(business);
    } catch (err) {
      console.error("Error al guardar:", err);
      toast({ title: "No se pudo actualizar guardados", variant: "error" });
    } finally {
      setSavingToggle(false);
    }
  };

  // SIEM-sourced businesses have no coordinates — only a text address, which
  // is always present for them, so this fallback never actually triggers
  // for that source.
  const hasCoords = business.lat != null && business.lng != null;
  const mapsQuery = encodeURIComponent(
    [business.name, business.address].filter(Boolean).join(", ") ||
      (hasCoords ? `${business.lat},${business.lng}` : business.name)
  );
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const directionsUrl = hasCoords
    ? // Without a shared location, omitting origin lets Google Maps use the
      // device's own position instead of a made-up starting point.
      `https://www.google.com/maps/dir/?api=1${userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ""}&destination=${business.lat},${business.lng}`
    : null;

  return (
    <>
      <DrawerHeader className="flex-row items-center gap-2 text-left">
        <Button variant="ghost" size="icon" className="size-10" onClick={onBack} aria-label="Volver a la lista">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <DrawerTitle className="min-w-0 flex-1 truncate text-left">{toTitleCase(business.name)}</DrawerTitle>
        <Button
          variant={saved ? "default" : "outline"}
          size="icon"
          className="size-10 shrink-0"
          onClick={handleToggleSave}
          disabled={savingToggle}
          aria-label={saved ? "Quitar de guardados" : "Guardar para más tarde"}
        >
          {savingToggle ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
      </DrawerHeader>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-4 pt-2">
          {business.address && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{toTitleCase(business.address)}</span>
            </div>
          )}
          {meta.category && (
            <div className="flex items-start gap-3 text-sm">
              <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{toTitleCase(meta.category)}</span>
            </div>
          )}
          {meta.employees && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{meta.employees} empleados</span>
            </div>
          )}
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="flex items-center gap-3 text-sm text-primary"
            >
              <Phone className="h-4 w-4 shrink-0" />
              {business.phone}
            </a>
          )}
          {business.email && (
            <a
              href={`mailto:${business.email}`}
              className="flex items-center gap-3 text-sm text-primary"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {business.email.toLowerCase()}
            </a>
          )}
          {business.website && (
            <a
              href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 text-sm text-primary"
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className="truncate">{business.website.toLowerCase()}</span>
            </a>
          )}
          {!hasContactInfo && (
            <p className="text-sm text-muted-foreground">
              DENUE no tiene más datos de contacto para este negocio.
            </p>
          )}
          {nextAppointment ? (
            <button
              type="button"
              onClick={() => setAppointmentDrawerTarget(nextAppointment.id)}
              className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left text-sm text-primary"
            >
              <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                Próxima cita: {new Date(nextAppointment.start_at).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                })}
                {" · "}
                {timeLabel(new Date(nextAppointment.start_at))} · {nextAppointment.title}
              </span>
            </button>
          ) : (
            <Button variant="outline" className="w-fit gap-2" onClick={() => setAppointmentDrawerTarget("new")}>
              <CalendarPlus className="h-4 w-4" />
              Agendar cita
            </Button>
          )}
          {siemMatch && (
            <div className="mt-1 flex flex-col gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                También encontrado en SIEM
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-normal text-primary/70">
                  {siemMatchIsExact ? "Coincidencia exacta" : "Posible, por nombre"}
                </span>
              </div>
              {missingPhone && siemMatch.telefono && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {siemMatch.telefono}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={applyingSiemField === "phone"}
                    onClick={() => applySiemField("phone", siemMatch.telefono!)}
                  >
                    {applyingSiemField === "phone" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Usar este teléfono"
                    )}
                  </Button>
                </div>
              )}
              {missingEmail && siemMatch.e_mail && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{siemMatch.e_mail.toLowerCase()}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={applyingSiemField === "email"}
                    onClick={() => applySiemField("email", siemMatch.e_mail!)}
                  >
                    {applyingSiemField === "email" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Usar este correo"
                    )}
                  </Button>
                </div>
              )}
              {siemMatch.rango_empleados && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {siemMatch.rango_empleados} empleados (según SIEM)
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
      <DrawerFooter className="gap-2.5">
        <Button
          variant="secondary"
          className="h-11 gap-2 text-base"
          onClick={handleMarkVisited}
          disabled={markingVisited}
        >
          {markingVisited ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Marcar como visitado
        </Button>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            className="h-11 flex-1 gap-2 text-base"
            nativeButton={false}
            render={<a href={mapsSearchUrl} target="_blank" rel="noreferrer" />}
          >
            <Search className="h-4 w-4" />
            Google Maps
          </Button>
          <Button
            className="h-11 flex-1 gap-2 text-base"
            disabled={!directionsUrl}
            nativeButton={false}
            render={directionsUrl ? <a href={directionsUrl} target="_blank" rel="noreferrer" /> : undefined}
          >
            <Navigation className="h-4 w-4" />
            Cómo llegar
          </Button>
        </div>
      </DrawerFooter>

      <AppointmentDrawer
        target={appointmentDrawerTarget}
        projectId={projectId}
        defaults={{
          businessId: business.id,
          linkedName: toTitleCase(business.name),
          title: `Llamada con ${toTitleCase(business.name)}`,
          location: business.address ?? undefined,
        }}
        onOpenChange={(open) => !open && setAppointmentDrawerTarget(null)}
        onSaved={(appointment) => setNextAppointment(appointment.status === "scheduled" ? appointment : null)}
        onDeleted={() => setNextAppointment(null)}
      />
    </>
  );
}
