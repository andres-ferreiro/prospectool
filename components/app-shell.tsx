"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { BusinessMap, type BusinessMapHandle } from "@/components/map-view/business-map";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LocationSearchBar } from "@/components/layout/location-search-bar";
import { CreateProjectDrawer } from "@/components/project-setup/create-project-drawer";
import { EditProjectDrawer } from "@/components/project-setup/edit-project-drawer";
import { LocationStepOverlay, type ResolvedSearchLocation } from "@/components/onboarding/location-step-overlay";
import { PaywallModal } from "@/components/billing/paywall-modal";
import { UnlockedModal } from "@/components/billing/unlocked-modal";
import { useUser } from "@/hooks/use-user";
import { toast } from "@/lib/toast";
import { DEFAULT_SEARCH_RADIUS_M } from "@/lib/project-base-search";
import { canCreateProject } from "@/lib/billing/limits";
import { openPaywall, type PaywallReason } from "@/lib/paywall";
import type {
  BusinessRow,
  LeadRow,
  LeadWithBusiness,
  ProjectBaseSearch,
  ProjectRow,
  SavedBusinessWithBusiness,
} from "@/lib/db/types";

const PAYWALL_REASONS = new Set<string>(["proyecto", "crm", "resultados", "calendario"]);

// Projects whose location step was skipped during this page session — kept
// at module scope (not state) because switching to the CRM tab and back
// remounts AppShell, and "not now" shouldn't re-ask on every tab switch.
const skippedLocationStep = new Set<string>();

interface AppShellProps {
  initialProjects: ProjectRow[];
  activeProject: ProjectRow | null;
  isPaid: boolean;
}

export function AppShell({ initialProjects, activeProject, isPaid }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useUser();
  const mapRef = useRef<BusinessMapHandle>(null);
  const [projects, setProjects] = useState(initialProjects);
  const [drawerOpen, setDrawerOpen] = useState(initialProjects.length === 0);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [leads, setLeads] = useState<LeadWithBusiness[]>([]);
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusinessWithBusiness[]>([]);
  // Set the moment the location step resolves, so the map and the step
  // react immediately instead of waiting on the PATCH + a server refresh.
  const [baseSearchOverride, setBaseSearchOverride] = useState<ProjectBaseSearch | null>(null);
  const baseSearch = baseSearchOverride ?? activeProject?.base_search ?? null;
  const [locationStepSkipped, setLocationStepSkipped] = useState(
    () => !!activeProject && skippedLocationStep.has(activeProject.id)
  );
  // A project without a saved search area (brand new, AI flow or not) asks
  // where to search — BusinessMap never guesses a location on its own.
  const locationStepOpen = !!activeProject && !baseSearch?.center && !locationStepSkipped;
  const [showUnlockedModal, setShowUnlockedModal] = useState(false);

  // Reset before loading, so switching projects doesn't briefly show the
  // previous project's CRM state (mirrors the reset pattern in business-map.tsx).
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      setLeads([]);
      setSavedBusinesses([]);
    }, 0);
    return () => clearTimeout(resetTimer);
  }, [activeProject]);

  // Load leads + saved businesses for this project, so the map (pins + the
  // drawer's quick actions) reflects existing CRM state.
  useEffect(() => {
    if (!activeProject) return;
    let cancelled = false;

    fetch(`/api/leads?projectId=${activeProject.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLeads((data.leads ?? []) as LeadWithBusiness[]);
      })
      .catch((err) => {
        console.error("Error al cargar leads:", err);
        if (!cancelled) toast({ title: "No se pudieron cargar tus leads", variant: "error" });
      });

    fetch(`/api/saved-businesses?projectId=${activeProject.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSavedBusinesses((data.saved ?? []) as SavedBusinessWithBusiness[]);
      })
      .catch((err) => {
        console.error("Error al cargar guardados:", err);
        if (!cancelled) toast({ title: "No se pudieron cargar tus negocios guardados", variant: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject]);

  const handleCreated = (project: ProjectRow) => {
    setProjects((prev) => [project, ...prev]);
    setDrawerOpen(false);
    router.push(`/proyectos/${project.id}`);
  };

  const handleSaved = () => {
    setEditDrawerOpen(false);
    router.refresh();
  };

  const handleMarkVisited = async (business: BusinessRow) => {
    if (!activeProject) return;
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProject.id, businessId: business.id }),
    });
    const lead = await res.json();
    if (!res.ok) throw new Error(lead.error ?? "Error desconocido");
    setLeads((prev) => [
      { ...lead, business, contacts: [] },
      ...prev.filter((l) => l.business_id !== business.id),
    ]);
  };

  const handleToggleSave = async (business: BusinessRow) => {
    if (!activeProject) return;
    const isSaved = savedBusinesses.some((s) => s.business_id === business.id);

    if (isSaved) {
      setSavedBusinesses((prev) => prev.filter((s) => s.business_id !== business.id));
      const res = await fetch(
        `/api/saved-businesses?projectId=${activeProject.id}&businessId=${business.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("No se pudo quitar de guardados");
    } else {
      const res = await fetch("/api/saved-businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, businessId: business.id }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error ?? "Error desconocido");
      setSavedBusinesses((prev) => [{ ...saved, business }, ...prev]);
    }
  };

  const handleLeadUpdated = (updated: LeadRow) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  };

  const handleLocationResolved = (location: ResolvedSearchLocation) => {
    if (!activeProject) return;
    const next: ProjectBaseSearch = {
      center: location.center,
      radiusM: DEFAULT_SEARCH_RADIUS_M,
      entidad: location.entidad,
      municipio: location.municipio,
      // Picked by the AI flow at creation — kept as-is.
      scianCodes: baseSearch?.scianCodes ?? [],
    };
    setBaseSearchOverride(next);
    mapRef.current?.runBaseSearch(next);

    fetch(`/api/projects/${activeProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseSearch: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
      .catch((err) => {
        console.error("Error al guardar la búsqueda del proyecto:", err);
        toast({
          title: "No se pudo guardar la zona del proyecto",
          description: "Tus resultados se muestran igual, pero te la pediremos de nuevo la próxima vez.",
          variant: "error",
        });
      });
  };

  const handleLocationSkip = () => {
    if (activeProject) skippedLocationStep.add(activeProject.id);
    setLocationStepSkipped(true);
  };

  // The CRM route's server-side gate can't open a client modal directly —
  // it redirects here with ?paywall=<reason> instead, and this opens the
  // real modal on arrival, then strips the param so a refresh doesn't
  // reopen it.
  useEffect(() => {
    const reason = searchParams.get("paywall");
    if (!reason || !PAYWALL_REASONS.has(reason)) return;
    openPaywall(reason as PaywallReason);
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  // Stripe's checkout success_url lands here with ?checkout=exito — a real
  // browser redirect (not a client-side transition), so by the time this
  // runs, the server already rendered this page with the fresh isPaid from
  // Stripe's webhook. That's the point: redirecting straight here instead
  // of through /precios first is what fixes isPaid staying stale (and
  // locked results still showing) until a manual refresh.
  useEffect(() => {
    if (searchParams.get("checkout") !== "exito") return;
    setShowUnlockedModal(true);
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <BusinessMap
        ref={mapRef}
        project={activeProject}
        suppressDrawer={drawerOpen}
        baseSearch={baseSearch}
        onboardingActive={locationStepOpen}
        leads={leads}
        savedBusinesses={savedBusinesses}
        onMarkVisited={handleMarkVisited}
        onToggleSave={handleToggleSave}
        onLeadUpdated={handleLeadUpdated}
        isPaid={isPaid}
      />

      <TopBar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => router.push(`/proyectos/${id}`)}
        onCreateProject={() => {
          if (!canCreateProject({ isPaid, projectCount: projects.length })) {
            openPaywall("proyecto");
            return;
          }
          setDrawerOpen(true);
        }}
        onEditProject={() => setEditDrawerOpen(true)}
        user={user}
        isPaid={isPaid}
      />

      {!drawerOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-6">
          <div className="pointer-events-auto w-full max-w-md">
            <LocationSearchBar onSelect={(center) => mapRef.current?.flyToAndSearch(center)} />
          </div>
        </div>
      )}

      <CreateProjectDrawer
        open={drawerOpen}
        dismissible={projects.length > 0}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />

      <EditProjectDrawer
        open={editDrawerOpen}
        project={activeProject}
        onClose={() => setEditDrawerOpen(false)}
        onSaved={handleSaved}
      />

      <LocationStepOverlay
        open={locationStepOpen && !drawerOpen && !showUnlockedModal}
        onResolved={handleLocationResolved}
        onSkip={handleLocationSkip}
      />

      {activeProject && !drawerOpen && <BottomNav projectId={activeProject.id} active="map" isPaid={isPaid} />}

      <PaywallModal />
      <UnlockedModal open={showUnlockedModal} onClose={() => setShowUnlockedModal(false)} />
    </div>
  );
}
