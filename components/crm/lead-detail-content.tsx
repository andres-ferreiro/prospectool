"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
  type BusinessRow,
  type LeadActivityRow,
  type LeadContactRow,
  type LeadRow,
  type LeadWithBusiness,
  type Stage,
} from "@/lib/db/types";
import { getBusinessMeta } from "@/lib/business-meta";
import type { SiemRow } from "@/lib/siem/types";
import { toTitleCase } from "@/lib/text";
import { toast } from "@/lib/toast";

interface LeadDetailContentProps {
  leadId: string;
  onUpdated?: (lead: LeadRow) => void;
  /** Fires whenever the saved contact list actually changes (add/edit/
   *  delete) — lets the CRM list/Kanban cards, which show a contact preview
   *  from data loaded in bulk up front, reflect an edit immediately instead
   *  of only after the next full reload. */
  onContactsChanged?: (leadId: string, contacts: LeadContactRow[]) => void;
  /** Shows a back button in the header instead of relying on swipe-to-close. */
  onBack?: () => void;
  /** Wishlist toggle — only shown when provided (map flow, not the CRM board). */
  saved?: boolean;
  onToggleSave?: () => Promise<void>;
  /** Enables the "Google Maps" / "Cómo llegar" quick actions in the footer. */
  userLocation?: { lat: number; lng: number };
}

interface ContactDraft {
  id: string | null;
  localId: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

function toDraft(row: LeadContactRow): ContactDraft {
  return {
    id: row.id,
    localId: row.id,
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    created_at: row.created_at,
  };
}

function draftsToRows(leadId: string, drafts: ContactDraft[]): LeadContactRow[] {
  return drafts
    .filter((d): d is ContactDraft & { id: string } => d.id !== null)
    .map((d) => ({
      id: d.id,
      lead_id: leadId,
      name: d.name || null,
      phone: d.phone || null,
      email: d.email || null,
      created_at: d.created_at,
    }));
}

let localIdSeq = 0;
function newLocalId() {
  localIdSeq += 1;
  return `new-${localIdSeq}`;
}

export function LeadDetailContent({
  leadId,
  onUpdated,
  onContactsChanged,
  onBack,
  saved,
  onToggleSave,
  userLocation,
}: LeadDetailContentProps) {
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<LeadWithBusiness | null>(null);
  const [activities, setActivities] = useState<LeadActivityRow[]>([]);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<Stage>("contacted");
  const [saving, setSaving] = useState(false);
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);
  // Which contact (by localId) is currently shown as an editable form —
  // every other saved contact renders as a compact read-only row instead.
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  // Last-persisted values per contact, so cancelling an edit can revert
  // in-progress changes instead of leaving the row in a half-edited state.
  const [contactSnapshots, setContactSnapshots] = useState<Record<string, ContactDraft>>({});
  // Deleting a contact is permanent and this is often mid-sales-call data —
  // the trash button requires a second tap within a few seconds ("¿Eliminar?")
  // rather than firing on the first tap, so a mis-tap can't destroy it.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [siemMatch, setSiemMatch] = useState<SiemRow | null>(null);
  const [applyingSiemField, setApplyingSiemField] = useState<"phone" | "email" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadingTimer = setTimeout(() => setLoading(true), 0);
    fetch(`/api/leads/${leadId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const l = data.lead as LeadWithBusiness;
        setLead(l);
        setActivities(data.activities as LeadActivityRow[]);
        const drafts = (data.contacts as LeadContactRow[]).map(toDraft);
        setContacts(drafts);
        setContactSnapshots(Object.fromEntries(drafts.map((d) => [d.localId, d])));
        setStage(l.stage);
        setNotes(l.notes ?? "");
      })
      .catch((err) => {
        console.error("Error al cargar el lead:", err);
        toast({ title: "No se pudo cargar el lead", variant: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
    };
  }, [leadId]);

  const leadBusiness = lead?.business ?? null;
  const missingPhone = !leadBusiness?.phone;
  const missingEmail = !leadBusiness?.email;
  useEffect(() => {
    setSiemMatch(null);
    if (!leadBusiness || leadBusiness.source !== "denue" || (!missingPhone && !missingEmail)) return;

    let cancelled = false;
    fetch(`/api/siem/match?businessId=${leadBusiness.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const matches = (data.matches ?? []) as SiemRow[];
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
  }, [leadBusiness, missingPhone, missingEmail]);

  const applySiemField = async (field: "phone" | "email", value: string) => {
    if (!leadBusiness) return;
    setApplyingSiemField(field);
    try {
      const res = await fetch(`/api/businesses/${leadBusiness.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      const updatedBusiness = data.business as BusinessRow;
      setLead((prev) => (prev ? { ...prev, business: updatedBusiness } : prev));
      toast({ title: "Dato actualizado", variant: "success" });
    } catch (err) {
      console.error("Error al aplicar dato de SIEM:", err);
      toast({ title: "No se pudo actualizar el dato", variant: "error" });
    } finally {
      setApplyingSiemField(null);
    }
  };

  const handleAddContact = () => {
    const localId = newLocalId();
    setContacts((prev) => [
      ...prev,
      { id: null, localId, name: "", phone: "", email: "", created_at: new Date().toISOString() },
    ]);
    setEditingContactId(localId);
  };

  const updateDraft = (localId: string, patch: Partial<ContactDraft>) => {
    setContacts((prev) => prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)));
  };

  const handleSaveContact = async (draft: ContactDraft) => {
    setSavingContactId(draft.localId);
    try {
      const body = { name: draft.name, phone: draft.phone, email: draft.email };
      let saved: ContactDraft;
      if (draft.id) {
        const res = await fetch(`/api/leads/${leadId}/contacts/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const updated = (await res.json()) as LeadContactRow;
        if (!res.ok) throw new Error("No se pudo guardar el contacto");
        saved = toDraft(updated);
      } else {
        const res = await fetch(`/api/leads/${leadId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const created = (await res.json()) as LeadContactRow;
        if (!res.ok) throw new Error("No se pudo crear el contacto");
        saved = toDraft(created);
      }
      setContacts((prev) => {
        const next = prev.map((c) => (c.localId === draft.localId ? saved : c));
        onContactsChanged?.(leadId, draftsToRows(leadId, next));
        return next;
      });
      setContactSnapshots((prev) => ({ ...prev, [saved.localId]: saved }));
      setEditingContactId(null);
      toast({ title: "Contacto guardado", variant: "success" });
    } catch (err) {
      console.error("Error al guardar el contacto:", err);
      toast({ title: "No se pudo guardar el contacto", variant: "error" });
    } finally {
      setSavingContactId(null);
    }
  };

  // First tap arms a several-second confirm window ("¿Eliminar?"); a second
  // tap on the same contact within that window actually deletes it. Tapping
  // a different contact's delete button re-arms for that one instead.
  const handleDeleteTap = (draft: ContactDraft) => {
    if (pendingDeleteId === draft.localId) {
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
      setPendingDeleteId(null);
      handleDeleteContact(draft);
      return;
    }
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setPendingDeleteId(draft.localId);
    pendingDeleteTimer.current = setTimeout(() => setPendingDeleteId(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    };
  }, []);

  const handleDeleteContact = async (draft: ContactDraft) => {
    if (draft.id) {
      try {
        await fetch(`/api/leads/${leadId}/contacts/${draft.id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Error al eliminar el contacto:", err);
        toast({ title: "No se pudo eliminar el contacto", variant: "error" });
        return;
      }
    }
    setContacts((prev) => {
      const next = prev.filter((c) => c.localId !== draft.localId);
      onContactsChanged?.(leadId, draftsToRows(leadId, next));
      return next;
    });
    setContactSnapshots((prev) => {
      const next = { ...prev };
      delete next[draft.localId];
      return next;
    });
    setEditingContactId((prev) => (prev === draft.localId ? null : prev));
  };

  const handleCancelEditContact = (draft: ContactDraft) => {
    if (!draft.id) {
      // Never-saved contact — cancelling discards the whole row.
      setContacts((prev) => prev.filter((c) => c.localId !== draft.localId));
    } else {
      const snapshot = contactSnapshots[draft.localId];
      if (snapshot) {
        setContacts((prev) => prev.map((c) => (c.localId === draft.localId ? snapshot : c)));
      }
    }
    setEditingContactId(null);
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    const stageChanged = stage !== lead.stage;
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, notes }),
      });
      const updated = (await res.json()) as LeadRow;
      if (!res.ok) throw new Error((updated as unknown as { error?: string }).error ?? "Error desconocido");

      setLead((prev) => (prev ? { ...prev, ...updated } : prev));
      if (stageChanged) {
        setActivities((prev) => [
          ...prev,
          {
            id: `pending-${Date.now()}`,
            lead_id: leadId,
            from_stage: lead.stage,
            to_stage: stage,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      onUpdated?.(updated);
      toast({ title: "Lead guardado", variant: "success" });
    } catch (err) {
      console.error("Error al guardar el lead:", err);
      toast({ title: "No se pudo guardar el lead", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSave = async () => {
    if (!onToggleSave) return;
    setSavingToggle(true);
    try {
      await onToggleSave();
    } catch (err) {
      console.error("Error al guardar:", err);
      toast({ title: "No se pudo actualizar guardados", variant: "error" });
    } finally {
      setSavingToggle(false);
    }
  };

  const business = leadBusiness;
  const hasContactInfo = business && (business.address || business.phone || business.email || business.website);
  const meta = business ? getBusinessMeta(business) : null;

  const hasCoords = business && business.lat != null && business.lng != null;
  const mapsQuery = business
    ? encodeURIComponent(
        [business.name, business.address].filter(Boolean).join(", ") ||
          (hasCoords ? `${business.lat},${business.lng}` : business.name)
      )
    : "";
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const directionsUrl =
    business && userLocation && hasCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${business.lat},${business.lng}`
      : null;

  return (
    <>
      <DrawerHeader className="flex-row items-center gap-2 text-left">
        {onBack && (
          <Button variant="ghost" size="icon" className="size-10" onClick={onBack} aria-label="Volver a la lista">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <DrawerTitle className="min-w-0 flex-1 truncate text-left">
          {business ? toTitleCase(business.name) : "Detalles del lead"}
        </DrawerTitle>
        {onToggleSave && (
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
        )}
      </DrawerHeader>

      {loading || !lead ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4 pt-2">
            {hasContactInfo && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
                {business!.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{toTitleCase(business!.address)}</span>
                  </div>
                )}
                {meta?.category && (
                  <div className="flex items-start gap-3 text-sm">
                    <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{toTitleCase(meta.category)}</span>
                  </div>
                )}
                {meta?.employees && (
                  <div className="flex items-start gap-3 text-sm">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{meta.employees} empleados</span>
                  </div>
                )}
                {business!.phone && (
                  <a href={`tel:${business!.phone}`} className="flex items-center gap-3 text-sm text-primary">
                    <Phone className="h-4 w-4 shrink-0" />
                    {business!.phone}
                  </a>
                )}
                {business!.email && (
                  <a href={`mailto:${business!.email}`} className="flex items-center gap-3 text-sm text-primary">
                    <Mail className="h-4 w-4 shrink-0" />
                    {business!.email.toLowerCase()}
                  </a>
                )}
                {business!.website && (
                  <a
                    href={business!.website.startsWith("http") ? business!.website : `https://${business!.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 text-sm text-primary"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="truncate">{business!.website.toLowerCase()}</span>
                  </a>
                )}
              </div>
            )}

            {siemMatch && (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  También encontrado en SIEM
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-stage">Etapa</Label>
              <select
                id="lead-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Contactos</Label>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAddContact}>
                  <Plus className="h-3.5 w-3.5" />
                  Agregar contacto
                </Button>
              </div>

              {contacts.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin contactos todavía. Agrega a quien hayas hablado.</p>
              )}

              {contacts.map((draft) =>
                draft.localId === editingContactId ? (
                  <div key={draft.localId} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Input
                          placeholder="Nombre"
                          value={draft.name}
                          onChange={(e) => updateDraft(draft.localId, { name: e.target.value })}
                        />
                        <Input
                          type="tel"
                          placeholder="Teléfono"
                          value={draft.phone}
                          onChange={(e) => updateDraft(draft.localId, { phone: e.target.value })}
                        />
                        <Input
                          type="email"
                          placeholder="Correo"
                          value={draft.email}
                          onChange={(e) => updateDraft(draft.localId, { email: e.target.value })}
                        />
                      </div>
                      {pendingDeleteId === draft.localId ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={() => handleDeleteTap(draft)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          ¿Eliminar?
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar contacto"
                          onClick={() => handleDeleteTap(draft)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleCancelEditContact(draft)}>
                        Cancelar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleSaveContact(draft)}
                        disabled={savingContactId === draft.localId}
                      >
                        {savingContactId === draft.localId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Guardar contacto
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={draft.localId}
                    className="flex items-center gap-2 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{draft.name || "Sin nombre"}</p>
                      {(draft.phone || draft.email) && (
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          {draft.phone && <p className="truncate text-xs text-muted-foreground">{draft.phone}</p>}
                          {draft.email && <p className="truncate text-xs text-muted-foreground">{draft.email}</p>}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar contacto"
                      onClick={() => setEditingContactId(draft.localId)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {pendingDeleteId === draft.localId ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={() => handleDeleteTap(draft)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ¿Eliminar?
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar contacto"
                        onClick={() => handleDeleteTap(draft)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">Cronología</p>
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin actividad todavía.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {activities.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[a.to_stage] }}
                        aria-hidden
                      />
                      <span className="text-foreground">
                        {a.from_stage
                          ? `${STAGE_LABELS[a.from_stage]} → ${STAGE_LABELS[a.to_stage]}`
                          : `Creado · ${STAGE_LABELS[a.to_stage]}`}
                      </span>
                      <span className="ml-auto shrink-0 text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>
      )}

      <DrawerFooter className="gap-2.5">
        {userLocation && business && (
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
            {directionsUrl && (
              <Button
                className="h-11 flex-1 gap-2 text-base"
                nativeButton={false}
                render={<a href={directionsUrl} target="_blank" rel="noreferrer" />}
              >
                <Navigation className="h-4 w-4" />
                Cómo llegar
              </Button>
            )}
          </div>
        )}
        <Button className="h-11 gap-2 text-base" onClick={handleSave} disabled={saving || loading}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </DrawerFooter>
    </>
  );
}
