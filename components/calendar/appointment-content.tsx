"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, Clock, Loader2, MapPin, Trash2 } from "lucide-react";
import { DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimeWheelPicker } from "./time-wheel-picker";
import { useIsDesktop } from "@/hooks/use-media-query";
import { toast } from "@/lib/toast";
import { toTitleCase } from "@/lib/text";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
  type AppointmentWithRelations,
} from "@/lib/db/types";

interface AppointmentContentProps {
  /** null = creating a new appointment. */
  appointmentId: string | null;
  projectId: string;
  /** Only used when appointmentId is null (pre-fill from a lead/business drawer or a calendar-cell click). */
  defaults?: {
    leadId?: string | null;
    businessId?: string | null;
    linkedName?: string | null;
    title?: string;
    location?: string;
    start?: Date;
  };
  onSaved?: (appointment: AppointmentWithRelations) => void;
  onDeleted?: (id: string) => void;
}

function toLocalTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineLocal(date: Date, time: string): Date {
  const [h, min] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, min);
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60000);
}

function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const meridiem = h >= 12 ? "p.m." : "a.m.";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${meridiem}`;
}

function formatDateLabel(d: Date) {
  const raw = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function AppointmentContent({ appointmentId, projectId, defaults, onSaved, onDeleted }: AppointmentContentProps) {
  const isDesktop = useIsDesktop();
  const [loading, setLoading] = useState(appointmentId !== null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialStart = defaults?.start ?? new Date();
  const initialEnd = addMinutes(initialStart, 30);

  const [title, setTitle] = useState(defaults?.title ?? "");
  const [date, setDate] = useState(initialStart);
  const [startTime, setStartTime] = useState(toLocalTimeInput(initialStart));
  const [endTime, setEndTime] = useState(toLocalTimeInput(initialEnd));
  const [location, setLocation] = useState(defaults?.location ?? "");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("scheduled");
  const [linkedName, setLinkedName] = useState<string | null>(defaults?.linkedName ?? null);
  const [leadId] = useState<string | null>(defaults?.leadId ?? null);
  const [businessId] = useState<string | null>(defaults?.businessId ?? null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  // Mobile only: which field's picker is expanded inline in the form
  // (below its trigger, using the drawer's own empty space) instead of a
  // floating Popover — a full-screen sheet has room for that and it reads
  // more native on touch than a small overlay anchored to a tiny button.
  const [activeField, setActiveField] = useState<"date" | "start" | "end" | null>(null);

  const toggleField = (field: "date" | "start" | "end") =>
    setActiveField((prev) => (prev === field ? null : field));

  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;
    const loadingTimer = setTimeout(() => setLoading(true), 0);
    fetch(`/api/appointments/${appointmentId}`)
      .then((res) => res.json())
      .then((data: AppointmentWithRelations) => {
        if (cancelled) return;
        const start = new Date(data.start_at);
        const end = new Date(data.end_at);
        setTitle(data.title);
        setDate(start);
        setStartTime(toLocalTimeInput(start));
        setEndTime(toLocalTimeInput(end));
        setLocation(data.location ?? "");
        setNotes(data.notes ?? "");
        setStatus(data.status);
        setLinkedName(data.business?.name ? toTitleCase(data.business.name) : null);
      })
      .catch((err) => {
        console.error("Error al cargar la cita:", err);
        toast({ title: "No se pudo cargar la cita", variant: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
    };
  }, [appointmentId]);

  useEffect(() => {
    return () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
    };
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Completa el título de la cita", variant: "error" });
      return;
    }
    const start = combineLocal(date, startTime);
    const end = combineLocal(date, endTime);
    if (end <= start) {
      toast({ title: "La hora de fin debe ser después del inicio", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      if (appointmentId) {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            location,
            notes,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            status,
          }),
        });
        const updated = (await res.json()) as AppointmentWithRelations;
        if (!res.ok) throw new Error("Error desconocido");
        onSaved?.(updated);
      } else {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            lead_id: leadId,
            business_id: businessId,
            title: title.trim(),
            location,
            notes,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
          }),
        });
        const created = (await res.json()) as AppointmentWithRelations;
        if (!res.ok) throw new Error("Error desconocido");
        onSaved?.(created);
      }
      toast({ title: "Cita guardada", variant: "success" });
    } catch (err) {
      console.error("Error al guardar la cita:", err);
      toast({ title: "No se pudo guardar la cita", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (next: AppointmentStatus) => {
    if (!appointmentId) return;
    setStatus(next);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const updated = (await res.json()) as AppointmentWithRelations;
      if (!res.ok) throw new Error("Error desconocido");
      onSaved?.(updated);
      toast({ title: "Estado actualizado", variant: "success" });
    } catch (err) {
      console.error("Error al actualizar el estado:", err);
      toast({ title: "No se pudo actualizar el estado", variant: "error" });
    }
  };

  const handleDeleteTap = () => {
    if (!appointmentId) return;
    if (pendingDelete) {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      handleDelete();
      return;
    }
    setPendingDelete(true);
    deleteTimer.current = setTimeout(() => setPendingDelete(false), 3000);
  };

  const handleDelete = async () => {
    if (!appointmentId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error desconocido");
      onDeleted?.(appointmentId);
      toast({ title: "Cita eliminada", variant: "success" });
    } catch (err) {
      console.error("Error al eliminar la cita:", err);
      toast({ title: "No se pudo eliminar la cita", variant: "error" });
    } finally {
      setDeleting(false);
      setPendingDelete(false);
    }
  };

  return (
    <>
      <DrawerHeader className="text-left">
        <DrawerTitle>{appointmentId ? "Editar cita" : "Nueva cita"}</DrawerTitle>
      </DrawerHeader>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4 pt-2">
            {linkedName && (
              <Badge variant="outline" className="w-fit gap-1.5">
                <MapPin className="h-3 w-3" />
                Vinculado a: {linkedName}
              </Badge>
            )}

            {appointmentId && (
              <div className="flex flex-col gap-1.5">
                <Label>Estado</Label>
                <div className="flex flex-wrap gap-2">
                  {APPOINTMENT_STATUSES.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={status === s ? "default" : "outline"}
                      onClick={() => handleStatusChange(s)}
                    >
                      {APPOINTMENT_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-title">Título</Label>
              <Input
                id="appt-title"
                className="h-11"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Llamada con..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Fecha</Label>
              {isDesktop ? (
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger render={<Button variant="outline" className="h-11 justify-start gap-2 font-normal" />}>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    {formatDateLabel(date)}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      defaultMonth={date}
                      onSelect={(next) => {
                        if (!next) return;
                        setDate(next);
                        setDatePopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  variant="outline"
                  className="h-11 justify-start gap-2 font-normal"
                  onClick={() => toggleField("date")}
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {formatDateLabel(date)}
                </Button>
              )}
            </div>

            {!isDesktop && activeField === "date" && (
              <Calendar
                mode="single"
                selected={date}
                defaultMonth={date}
                onSelect={(next) => {
                  if (!next) return;
                  setDate(next);
                  setActiveField(null);
                }}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label>Inicio</Label>
                {isDesktop ? (
                  <Popover>
                    <PopoverTrigger render={<Button variant="outline" className="h-11 justify-start gap-2 font-normal" />}>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatTime12h(startTime)}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <TimeWheelPicker value={startTime} onChange={setStartTime} />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button
                    variant="outline"
                    className="h-11 justify-start gap-2 font-normal"
                    onClick={() => toggleField("start")}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatTime12h(startTime)}
                  </Button>
                )}
                {!isDesktop && activeField === "start" && (
                  <TimeWheelPicker
                    className="!w-full border-0 bg-transparent shadow-none dark:bg-transparent"
                    value={startTime}
                    onChange={setStartTime}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fin</Label>
                {isDesktop ? (
                  <Popover>
                    <PopoverTrigger render={<Button variant="outline" className="h-11 justify-start gap-2 font-normal" />}>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatTime12h(endTime)}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <TimeWheelPicker value={endTime} onChange={setEndTime} />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button
                    variant="outline"
                    className="h-11 justify-start gap-2 font-normal"
                    onClick={() => toggleField("end")}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatTime12h(endTime)}
                  </Button>
                )}
                {!isDesktop && activeField === "end" && (
                  <TimeWheelPicker
                    className="!w-full border-0 bg-transparent shadow-none dark:bg-transparent"
                    value={endTime}
                    onChange={setEndTime}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-location">Ubicación</Label>
              <Input
                id="appt-location"
                className="h-11"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Dirección o link de la llamada"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-notes">Notas</Label>
              <Textarea id="appt-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {appointmentId && (
              <div className="pt-2">
                {pendingDelete ? (
                  <Button variant="destructive" className="w-full gap-2" onClick={handleDeleteTap} disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    ¿Eliminar cita?
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleDeleteTap}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar cita
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      <DrawerFooter>
        <Button className="h-11 gap-2 text-base" onClick={handleSave} disabled={saving || loading}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cita
        </Button>
      </DrawerFooter>
    </>
  );
}
