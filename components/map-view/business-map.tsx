"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Eye, EyeOff, Loader2, Telescope, X } from "lucide-react";
import MapGL, { Layer, Marker, Source, type MapRef } from "react-map-gl/mapbox";
import type { GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
import type {
  ProjectRow,
  BusinessRow,
  LeadRow,
  LeadWithBusiness,
  SavedBusinessWithBusiness,
  Stage,
} from "@/lib/db/types";
import { STAGES, STAGE_COLORS, SAVED_COLOR } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { BusinessPin } from "./business-pin";
import { MapStateBanner } from "./map-state-banner";
import { MyLocationDot } from "./my-location-dot";
import { LocateButton } from "./locate-button";
import { SearchAreaButton } from "./search-area-button";
import { ResultsDrawer } from "./results-drawer";
import { ResultsToggle } from "./results-toggle";
import { MapSettingsDrawer, type LayerKey } from "./map-settings-drawer";
import { AdvancedSearchDrawer } from "./advanced-search-drawer";
import { AdvancedSearchProgress } from "./advanced-search-progress";
import { useCurrentLocation } from "@/hooks/use-current-location";
import { readCachedSearch, writeCachedSearch } from "@/lib/search-cache";
import { hasSeenMapControlsHint, markMapControlsHintSeen } from "@/lib/onboarding";
import { haversineMeters, radiusFromBounds } from "@/lib/geo";
import { toast } from "@/lib/toast";

type Status = "idle" | "loading" | "loaded" | "error";

export interface BusinessMapHandle {
  /** Fly the map to a location and immediately search there. */
  flyToAndSearch: (center: { lat: number; lng: number }) => void;
}

interface BusinessMapProps {
  project: ProjectRow | null;
  /** True while another drawer (e.g. project creation) is open. */
  suppressDrawer?: boolean;
  leads: LeadWithBusiness[];
  savedBusinesses: SavedBusinessWithBusiness[];
  onMarkVisited: (business: BusinessRow) => Promise<void>;
  onToggleSave: (business: BusinessRow) => Promise<void>;
  onLeadUpdated: (lead: LeadRow) => void;
}

const DEFAULT_RADIUS_M = 1500;
const MOVE_THRESHOLD_M = 250;
// Pins are naturally spread out enough by this zoom that a name label per
// pin reads as useful rather than as clutter — below it, only the
// selected pin gets a label (see BusinessPin).
const LABEL_ZOOM_THRESHOLD = 16;
const INITIAL_ZOOM = 14;
const ALL_LAYERS: LayerKey[] = ["results", "saved", ...STAGES];
// How many categories to search at once — cuts wall-clock time roughly
// proportionally, bounded so a burst of parallel DENUE requests doesn't
// trigger the same stalling behavior firing everything at once did for the
// regular keyword search.
const ADVANCED_SEARCH_CONCURRENCY = 3;
// A distinct hue (not used by any CRM stage or the saved/keyword palettes)
// so advanced-search pins read as a different kind of result at a glance.
const ADVANCED_SEARCH_COLOR = "#6366f1";
// Literal value of --primary (app/globals.css) — same in light and dark.
// Mapbox paint expressions need a literal color, not a CSS var, since they
// run on the GPU outside the page's own styling.
const DEFAULT_PIN_COLOR = "#0a84ff";
const PINS_SOURCE_ID = "business-pins";
const CLUSTER_LAYER_ID = "business-clusters";
const UNCLUSTERED_LAYER_ID = "business-unclustered-point";

function layerColor(status: LayerKey): string {
  return status === "saved" ? SAVED_COLOR : STAGE_COLORS[status as Stage];
}

export const BusinessMap = forwardRef<BusinessMapHandle, BusinessMapProps>(function BusinessMap(
  { project, suppressDrawer = false, leads, savedBusinesses, onMarkVisited, onToggleSave, onLeadUpdated },
  ref
) {
  const mapRef = useRef<MapRef>(null);
  const { resolvedTheme } = useTheme();
  const { location, resolved, isPrecise } = useCurrentLocation();
  const [status, setStatus] = useState<Status>("idle");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  // Telescope ("búsqueda avanzada") and the eye toggle aren't standard
  // iconography, and nothing else in the app explains them — this shows
  // once, ever, per browser (see lib/onboarding.ts), not once per session.
  const [showMapControlsHint, setShowMapControlsHint] = useState(false);
  useEffect(() => {
    if (!hasSeenMapControlsHint()) setShowMapControlsHint(true);
  }, []);
  const dismissMapControlsHint = () => {
    markMapControlsHintSeen();
    setShowMapControlsHint(false);
  };
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessRow | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(new Set(ALL_LAYERS));
  // Which keyword(s) each search-result business matched — a business found
  // by more than one keyword keeps every match, so it stays visible as long
  // as at least one of its keywords is still active.
  const [businessKeywords, setBusinessKeywords] = useState<Map<string, Set<string>>>(new Map());
  const [activeKeywords, setActiveKeywords] = useState<Set<string>>(new Set(project?.keywords ?? []));
  // Standalone advanced-search (SCIAN code + municipio) results — a
  // completely separate pool from the pill/keyword radius search above.
  // Never cleared by panning, "buscar en esta área," or keyword toggles.
  const [advancedResults, setAdvancedResults] = useState<BusinessRow[]>([]);
  // Both the search itself (25-category cap, see advanced-search-drawer.tsx)
  // and rendering can get overwhelming — a single popular category can
  // return thousands of matches, and each map pin is a real DOM element
  // (react-map-gl Markers aren't GPU-rendered), so thousands of them
  // genuinely risks jank/crashes. Users can hide them entirely (they're
  // still all in the results list/drawer), and rendering itself is capped.
  const [showAdvancedPins, setShowAdvancedPins] = useState(true);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearchCenter, setAdvancedSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [advancedProgress, setAdvancedProgress] = useState<{
    running: boolean;
    completed: number;
    total: number;
    found: number;
    failed: number;
  } | null>(null);
  // Dismissing the progress card used to discard advancedProgress entirely
  // — if a multi-minute background search was still running, that was the
  // only feedback it had, gone with no way back. Now dismiss just collapses
  // it to a small re-openable chip instead of destroying the state.
  const [progressCardVisible, setProgressCardVisible] = useState(true);
  const lastSearchCenter = useRef<{ lat: number; lng: number } | null>(null);
  // Tracked alongside lastSearchCenter so the empty/error state banners can
  // offer "retry" and "search a wider radius" without the user having to
  // re-trigger anything manually.
  const lastRadius = useRef<number>(DEFAULT_RADIUS_M);
  const autoSearched = useRef(false);
  // Set right before a programmatic camera move (e.g. fitBounds after an
  // advanced search) so the resulting moveend doesn't misfire the "buscar
  // en esta área" prompt, which should only follow a genuine user pan.
  const suppressNextMoveEnd = useRef(false);

  const leadsByBusinessId = useMemo(
    () => new Map(leads.map((lead) => [lead.business_id, lead])),
    [leads]
  );
  const savedIds = useMemo(
    () => new Set(savedBusinesses.map((s) => s.business_id)),
    [savedBusinesses]
  );

  // Reflects a SIEM-enrichment update (a filled-in email/phone) everywhere
  // this business already appears, without needing to refetch anything.
  const handleBusinessUpdated = useCallback((updated: BusinessRow) => {
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setAdvancedResults((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBusiness((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const toggleLayer = (key: LayerKey) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleKeyword = (keyword: string) => {
    setActiveKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const keywordCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const keywordSet of businessKeywords.values()) {
      for (const keyword of keywordSet) counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
    return counts;
  }, [businessKeywords]);

  const stageCounts = useMemo(() => {
    const counts = new Map<Stage, number>();
    for (const stage of STAGES) counts.set(stage, 0);
    for (const lead of leads) counts.set(lead.stage, (counts.get(lead.stage) ?? 0) + 1);
    return counts;
  }, [leads]);

  // Each search-result business gets a CRM/saved status (if any); whether it
  // renders as a pin depends on whether that status's layer is checked (or
  // the plain "results" layer, for businesses with no status).
  const visibleSearchBusinesses = useMemo(() => {
    return businesses
      .map((business) => {
        const lead = leadsByBusinessId.get(business.id);
        const layerStatus: LayerKey | null = lead ? lead.stage : savedIds.has(business.id) ? "saved" : null;
        return { business, layerStatus };
      })
      .filter(({ layerStatus }) => (layerStatus ? activeLayers.has(layerStatus) : activeLayers.has("results")))
      .filter(({ business }) => {
        const keywords = businessKeywords.get(business.id);
        if (!keywords) return true;
        return Array.from(keywords).some((k) => activeKeywords.has(k));
      });
  }, [businesses, leadsByBusinessId, savedIds, activeLayers, businessKeywords, activeKeywords]);

  const businessIds = useMemo(() => new Set(businesses.map((b) => b.id)), [businesses]);
  const offSearchCrmBusinesses = useMemo(() => {
    const map = new Map<string, { business: BusinessRow; layerStatus: LayerKey }>();
    for (const lead of leads) {
      if (!businessIds.has(lead.business_id)) {
        map.set(lead.business_id, { business: lead.business, layerStatus: lead.stage });
      }
    }
    for (const saved of savedBusinesses) {
      if (!businessIds.has(saved.business_id) && !map.has(saved.business_id)) {
        map.set(saved.business_id, { business: saved.business, layerStatus: "saved" });
      }
    }
    return Array.from(map.values()).filter(({ layerStatus }) => activeLayers.has(layerStatus));
  }, [leads, savedBusinesses, businessIds, activeLayers]);

  // Advanced-search pins — deduped against the regular search (a business
  // could legitimately show up in both), CRM-stage colored the same way,
  // but never subject to the keyword filter (they have no keyword
  // provenance — they came from a SCIAN code + municipio, not a keyword).
  // Unlike the old per-Marker approach, clustering (see mapPinsGeoJSON below)
  // renders on the GPU, so the full set can render regardless of size — no
  // cap needed here anymore.
  const advancedResultsForDisplay = useMemo(() => {
    if (!showAdvancedPins) return [];
    return advancedResults
      .filter((business) => !businessIds.has(business.id) && business.lat != null && business.lng != null)
      .map((business) => {
        const lead = leadsByBusinessId.get(business.id);
        const layerStatus: LayerKey | null = lead ? lead.stage : savedIds.has(business.id) ? "saved" : null;
        return { business, layerStatus };
      })
      .filter(({ layerStatus }) => (layerStatus ? activeLayers.has(layerStatus) : activeLayers.has("results")));
  }, [advancedResults, businessIds, leadsByBusinessId, savedIds, activeLayers, showAdvancedPins]);

  // Every business currently eligible for a map pin, combined into one
  // clustered GL source instead of hundreds of individual DOM Markers (the
  // old approach — laggy past a few hundred pins, and dense areas like a
  // single busy street would render dozens of overlapping name labels no
  // matter how few results there were in total). The selected business is
  // excluded and rendered separately (see the lone <Marker> below) so its
  // pulse/pop treatment isn't duplicated by a flat GL dot underneath it.
  const businessById = useMemo(() => {
    const map = new Map<string, BusinessRow>();
    for (const { business } of visibleSearchBusinesses) map.set(business.id, business);
    for (const { business } of offSearchCrmBusinesses) map.set(business.id, business);
    for (const { business } of advancedResultsForDisplay) map.set(business.id, business);
    return map;
  }, [visibleSearchBusinesses, offSearchCrmBusinesses, advancedResultsForDisplay]);

  const mapPinsGeoJSON = useMemo((): FeatureCollection<Point, { id: string; name: string; color: string }> => {
    const features: Feature<Point, { id: string; name: string; color: string }>[] = [];
    const push = (business: BusinessRow, layerStatus: LayerKey | null, isAdvanced: boolean) => {
      if (business.lat == null || business.lng == null) return;
      if (business.id === selectedBusiness?.id) return;
      const color = layerStatus ? layerColor(layerStatus) : isAdvanced ? ADVANCED_SEARCH_COLOR : DEFAULT_PIN_COLOR;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [business.lng, business.lat] },
        properties: { id: business.id, name: business.name, color },
      });
    };
    for (const { business, layerStatus } of visibleSearchBusinesses) push(business, layerStatus, false);
    for (const { business, layerStatus } of offSearchCrmBusinesses) push(business, layerStatus, false);
    for (const { business, layerStatus } of advancedResultsForDisplay) push(business, layerStatus, true);
    return { type: "FeatureCollection", features };
  }, [visibleSearchBusinesses, offSearchCrmBusinesses, advancedResultsForDisplay, selectedBusiness]);

  // One shared results drawer for both search kinds — running two separate
  // Drawer instances at once turned out to conflict (Base UI's drawer
  // tracks open drawers globally for its nested-drawer/stacking behavior,
  // so a second simultaneous Root could leave the first inert). The
  // "avanzada" filter chip in BusinessList lets the list still be narrowed
  // to just one source when wanted.
  const advancedIds = useMemo(() => new Set(advancedResults.map((b) => b.id)), [advancedResults]);
  const allResultsBusinesses = useMemo(() => {
    const merged = new Map(businesses.map((b) => [b.id, b]));
    for (const b of advancedResults) if (!merged.has(b.id)) merged.set(b.id, b);
    return Array.from(merged.values());
  }, [businesses, advancedResults]);

  // Runs entirely in the background — the drawer that configured this
  // already closed, and the user can keep panning/searching/opening other
  // drawers while it streams results in. A bounded worker pool (not fully
  // sequential, not all-at-once) trades off total wall-clock time against
  // not stalling every request the way firing everything in parallel did
  // for the regular keyword search.
  const runAdvancedSearch = useCallback((codes: string[], entidad: string, municipio: string) => {
    setAdvancedProgress({ running: true, completed: 0, total: codes.length, found: 0, failed: 0 });
    setProgressCardVisible(true);

    let nextIndex = 0;
    let completed = 0;
    let found = 0;
    let failed = 0;

    async function worker() {
      while (nextIndex < codes.length) {
        const code = codes[nextIndex++];
        try {
          const qs = new URLSearchParams({ code, entidad, municipio });
          const res = await fetch(`/api/denue/search-by-code?${qs}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Error desconocido");
          const newBusinesses = data.businesses as BusinessRow[];
          found += newBusinesses.length;
          setAdvancedResults((prev) => {
            const merged = new Map(prev.map((b) => [b.id, b]));
            for (const b of newBusinesses) merged.set(b.id, b);
            return Array.from(merged.values());
          });

          // SIEM has no coordinates but the same scian/estado/municipio
          // scope — dedup against `businesses` (any source) happens
          // server-side, so anything returned here is genuinely new.
          try {
            const siemRes = await fetch(`/api/siem/search-by-code?${qs}`);
            const siemData = await siemRes.json();
            if (siemRes.ok) {
              const siemBusinesses = siemData.businesses as BusinessRow[];
              found += siemBusinesses.length;
              setAdvancedResults((prev) => {
                const merged = new Map(prev.map((b) => [b.id, b]));
                for (const b of siemBusinesses) merged.set(b.id, b);
                return Array.from(merged.values());
              });
            }
          } catch (siemErr) {
            console.error(`Error en búsqueda SIEM (código ${code}):`, siemErr);
          }
        } catch (err) {
          failed++;
          console.error(`Error en búsqueda avanzada (código ${code}):`, err);
        } finally {
          completed++;
          setAdvancedProgress({ running: true, completed, total: codes.length, found, failed });
        }
      }
    }

    const workerCount = Math.min(ADVANCED_SEARCH_CONCURRENCY, codes.length);
    Promise.all(Array.from({ length: workerCount }, worker)).then(() => {
      setAdvancedProgress((prev) => (prev ? { ...prev, running: false } : prev));

      setAdvancedResults((current) => {
        const withCoords = current.filter(
          (b): b is BusinessRow & { lat: number; lng: number } => b.lat != null && b.lng != null
        );
        if (withCoords.length > 0) {
          const lats = withCoords.map((b) => b.lat);
          const lngs = withCoords.map((b) => b.lng);
          suppressNextMoveEnd.current = true;
          mapRef.current?.getMap()?.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 60, duration: 800 }
          );
        }
        return current;
      });
    });
  }, []);

  const runSearch = useCallback(
    async (center: { lat: number; lng: number }, radiusM: number) => {
      if (!project) return;
      setStatus("loading");
      setShowSearchArea(false);
      lastSearchCenter.current = center;
      lastRadius.current = radiusM;

      // One request per keyword (the API caches/dedupes per keyword), then
      // merge — a business matching multiple keywords only appears once.
      // A single keyword failing (DENUE timeout, etc.) shouldn't wipe out
      // results that other keywords already found, so each request settles
      // independently instead of one rejection failing the whole batch.
      // Sequential, not parallel — DENUE is slow/flaky enough that firing
      // every keyword's request at once causes later ones to stall and hit
      // our client timeout, even though each succeeds fine on its own.
      const settled: PromiseSettledResult<BusinessRow[]>[] = [];
      for (const keyword of project.keywords) {
        const qs = new URLSearchParams({
          keyword,
          lat: String(center.lat),
          lng: String(center.lng),
          radiusM: String(Math.round(radiusM)),
        });

        // DENUE is flaky enough that a single timeout shouldn't sink an
        // otherwise-good keyword — retry once before giving up on it.
        let lastError: unknown;
        let succeeded = false;
        for (let attempt = 0; attempt < 2 && !succeeded; attempt++) {
          try {
            const res = await fetch(`/api/denue/search?${qs}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Error desconocido");
            settled.push({ status: "fulfilled", value: data.businesses as BusinessRow[] });
            succeeded = true;
          } catch (reason) {
            lastError = reason;
          }
        }
        if (!succeeded) settled.push({ status: "rejected", reason: lastError });
      }

      const merged = new Map<string, BusinessRow>();
      const keywordMap = new Map<string, Set<string>>();
      const failedKeywords: string[] = [];
      settled.forEach((result, i) => {
        if (result.status === "fulfilled") {
          const keyword = project.keywords[i];
          for (const business of result.value) {
            merged.set(business.id, business);
            const matched = keywordMap.get(business.id) ?? new Set<string>();
            matched.add(keyword);
            keywordMap.set(business.id, matched);
          }
        } else {
          failedKeywords.push(project.keywords[i]);
          console.error(`Error al buscar "${project.keywords[i]}":`, result.reason);
        }
      });
      setBusinessKeywords(keywordMap);

      if (failedKeywords.length > 0) {
        toast({
          title:
            failedKeywords.length === project.keywords.length
              ? "No se pudieron cargar los negocios"
              : "Algunas búsquedas fallaron",
          description: failedKeywords.length < project.keywords.length ? failedKeywords.join(", ") : undefined,
          variant: "error",
        });
      }

      const mergedBusinesses = Array.from(merged.values());
      setBusinesses(mergedBusinesses);
      setStatus(failedKeywords.length === project.keywords.length ? "error" : "loaded");
      setSelectedBusiness(null);
      setResultsOpen(mergedBusinesses.length > 0);

      if (failedKeywords.length < project.keywords.length) {
        writeCachedSearch(project.id, {
          businesses: mergedBusinesses,
          keywordEntries: Array.from(keywordMap.entries()).map(([id, kws]) => [id, Array.from(kws)]),
          center,
          radiusM,
        });
      }
    },
    [project]
  );

  useImperativeHandle(ref, () => ({
    flyToAndSearch: (center) => {
      mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 14, duration: 800 });
      runSearch(center, DEFAULT_RADIUS_M);
    },
  }));

  // Reset the "have we auto-searched yet" flag whenever the active project
  // changes, so switching projects triggers a fresh search around the user
  // — unless a recent search for it is already cached (see search-cache.ts),
  // in which case we hydrate straight from that instead of re-hitting DENUE.
  // This is what makes flipping between the map and CRM tabs (which fully
  // unmounts/remounts BusinessMap) show the same pins instantly rather than
  // re-searching every time.
  useEffect(() => {
    autoSearched.current = false;
    const cached = project ? readCachedSearch(project.id) : null;
    if (cached) autoSearched.current = true;

    const resetTimer = setTimeout(() => {
      setBusinesses(cached?.businesses ?? []);
      setStatus(cached ? "loaded" : "idle");
      setResultsOpen((cached?.businesses.length ?? 0) > 0);
      setSelectedBusiness(null);
      setBusinessKeywords(new Map(cached?.keywordEntries.map(([id, kws]) => [id, new Set(kws)]) ?? []));
      setActiveKeywords(new Set(project?.keywords ?? []));
      lastSearchCenter.current = cached?.center ?? null;
      // Advanced-search results are tied to whichever project is active
      // (mark-visited/save attributes to it), so they don't carry over.
      setAdvancedResults([]);
      setAdvancedProgress(null);
      setProgressCardVisible(true);
      setShowAdvancedPins(true);
    }, 0);
    return () => clearTimeout(resetTimer);
  }, [project]);

  // Land on the user's location and search automatically the first time we
  // have both a project and a resolved location.
  useEffect(() => {
    if (!project || !resolved || autoSearched.current) return;
    autoSearched.current = true;
    runSearch(location, DEFAULT_RADIUS_M);
  }, [project, resolved, location, runSearch]);

  const handleMoveEnd = () => {
    if (suppressNextMoveEnd.current) {
      suppressNextMoveEnd.current = false;
      return;
    }
    const map = mapRef.current?.getMap();
    if (!map || !lastSearchCenter.current) return;
    const c = map.getCenter();
    const moved = haversineMeters(lastSearchCenter.current, { lat: c.lat, lng: c.lng });
    if (moved > MOVE_THRESHOLD_M) setShowSearchArea(true);
  };

  const handleSearchThisArea = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const c = map.getCenter();
    const radiusM = radiusFromBounds(map.getBounds());
    runSearch({ lat: c.lat, lng: c.lng }, radiusM);
  };

  // Retry with the exact same center/radius — offered on the error banner.
  const handleRetrySearch = () => {
    if (lastSearchCenter.current) runSearch(lastSearchCenter.current, lastRadius.current);
  };

  // Doubles the radius (capped at DENUE's 5000m max) — offered on the
  // "no encontramos negocios" empty-result banner, since a first-timer has
  // no other obvious next step from a dead-end empty state.
  const handleWiderRadiusSearch = () => {
    if (lastSearchCenter.current) {
      runSearch(lastSearchCenter.current, Math.min(lastRadius.current * 2, 5000));
    }
  };

  const handlePinClick = (business: BusinessRow) => {
    setSelectedBusiness(business);
    setResultsOpen(true);
  };

  // A cluster bubble zooms in to break apart; an individual point selects
  // that business, same as the old per-Marker onClick did.
  const handleMapClick = (e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (feature.properties?.cluster) {
      const source = map.getSource(PINS_SOURCE_ID) as GeoJSONSource | undefined;
      const clusterId = feature.properties.cluster_id as number;
      source?.getClusterExpansionZoom(clusterId, (err, expansionZoom) => {
        if (err || expansionZoom == null || feature.geometry.type !== "Point") return;
        suppressNextMoveEnd.current = true;
        map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: expansionZoom });
      });
      return;
    }

    const id = feature.properties?.id as string | undefined;
    const business = id ? businessById.get(id) : undefined;
    if (business) handlePinClick(business);
  };

  // The selected pin's status (CRM stage/saved/advanced) for its color —
  // looked up the same way the old per-array Markers did, now unified since
  // there's only ever one selected pin to color.
  const selectedPinColor = useMemo(() => {
    if (!selectedBusiness) return DEFAULT_PIN_COLOR;
    const lead = leadsByBusinessId.get(selectedBusiness.id);
    const layerStatus: LayerKey | null = lead ? lead.stage : savedIds.has(selectedBusiness.id) ? "saved" : null;
    if (layerStatus) return layerColor(layerStatus);
    return advancedIds.has(selectedBusiness.id) ? ADVANCED_SEARCH_COLOR : DEFAULT_PIN_COLOR;
  }, [selectedBusiness, leadsByBusinessId, savedIds, advancedIds]);

  // Selecting a business (from the results list, or by tapping its pin)
  // centers the map on it and zooms in a little if it's currently zoomed
  // out further than that — paired with BusinessPin's pulse/pop, so there's
  // no guessing which pin on a dense map the selected result actually is.
  useEffect(() => {
    if (!selectedBusiness || selectedBusiness.lat == null || selectedBusiness.lng == null) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    suppressNextMoveEnd.current = true;
    map.flyTo({
      center: [selectedBusiness.lng, selectedBusiness.lat],
      zoom: Math.max(map.getZoom(), LABEL_ZOOM_THRESHOLD),
      duration: 700,
    });
  }, [selectedBusiness]);

  return (
    <div className="relative h-dvh w-full">
      <MapGL
        ref={mapRef}
        key={resolved ? "geo" : "default"}
        initialViewState={{ latitude: location.lat, longitude: location.lng, zoom: INITIAL_ZOOM }}
        onMoveEnd={handleMoveEnd}
        onClick={handleMapClick}
        interactiveLayerIds={[CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID]}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle={
          resolvedTheme === "dark"
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/light-v11"
        }
        style={{ width: "100%", height: "100%" }}
      >
        {/* GPU-rendered, so it scales to however many results there are —
            replaces what used to be one DOM Marker per business. Nearby
            pins collapse into a numbered cluster bubble until zoomed in
            enough to spread apart (see handleMapClick for the tap-to-expand
            behavior), which also fixes dense areas rendering dozens of
            overlapping name labels. */}
        <Source id={PINS_SOURCE_ID} type="geojson" data={mapPinsGeoJSON} cluster clusterMaxZoom={14} clusterRadius={50}>
          <Layer
            id={CLUSTER_LAYER_ID}
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": DEFAULT_PIN_COLOR,
              "circle-opacity": 0.85,
              "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26, 200, 32],
            }}
          />
          <Layer
            id="business-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{ "text-field": "{point_count_abbreviated}", "text-size": 12 }}
            paint={{ "text-color": "#fff" }}
          />
          <Layer
            id={UNCLUSTERED_LAYER_ID}
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": ["get", "color"],
              "circle-radius": 9,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff",
            }}
          />
          <Layer
            id="business-unclustered-label"
            type="symbol"
            filter={["!", ["has", "point_count"]]}
            minzoom={LABEL_ZOOM_THRESHOLD}
            layout={{
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-offset": [0, 1.2],
              "text-anchor": "top",
            }}
            paint={{ "text-color": resolvedTheme === "dark" ? "#fff" : "#000", "text-halo-color": "#fff", "text-halo-width": 1.5 }}
          />
        </Source>
        {selectedBusiness && selectedBusiness.lat != null && selectedBusiness.lng != null && (
          <Marker
            latitude={selectedBusiness.lat}
            longitude={selectedBusiness.lng}
            onClick={() => handlePinClick(selectedBusiness)}
          >
            <BusinessPin color={selectedPinColor} selected name={selectedBusiness.name} />
          </Marker>
        )}
        {isPrecise && (
          <Marker latitude={location.lat} longitude={location.lng} anchor="center">
            <MyLocationDot />
          </Marker>
        )}
      </MapGL>

      {showMapControlsHint && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-6">
          <div className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl bg-popover/95 pt-14 pb-3 px-3 text-sm shadow-soft backdrop-blur-xl">
            <Telescope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-foreground/80">
              <strong className="text-foreground">Búsqueda avanzada</strong> busca por categoría exacta (SCIAN) en
              vez de por palabra clave. El ícono del ojo muestra u oculta esos resultados en el mapa sin
              perderlos.
            </p>
            <button
              type="button"
              onClick={dismissMapControlsHint}
              aria-label="Entendido, no volver a mostrar"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showSearchArea && status !== "loading" && (
        <SearchAreaButton onClick={handleSearchThisArea} pushedDown={!!advancedProgress} />
      )}

      {isPrecise && (
        <LocateButton
          onClick={() =>
            mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 14, duration: 600 })
          }
        />
      )}

      {/* One shared toggle for the merged result set (regular + advanced —
          see the comment by allResultsBusinesses above for why they share a
          single drawer). The eye button is a separate, independent action —
          it only hides/shows advanced pins on the map without discarding
          them — so it stays visible even while the drawer is open. */}
      {((!resultsOpen && allResultsBusinesses.length > 0) || advancedResults.length > 0) && (
        <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-10 flex items-center gap-1.5">
          {!resultsOpen && allResultsBusinesses.length > 0 && (
            <ResultsToggle count={allResultsBusinesses.length} onClick={() => setResultsOpen(true)} />
          )}
          {advancedResults.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAdvancedPins((v) => !v)}
              aria-label={showAdvancedPins ? "Ocultar avanzados del mapa" : "Mostrar avanzados en el mapa"}
              aria-pressed={showAdvancedPins}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-soft"
              style={
                showAdvancedPins
                  ? { backgroundColor: ADVANCED_SEARCH_COLOR }
                  : { backgroundColor: "var(--color-popover)" }
              }
            >
              {showAdvancedPins ? (
                <Eye className="h-4 w-4 text-white" />
              ) : (
                <EyeOff className="h-4 w-4" style={{ color: ADVANCED_SEARCH_COLOR }} />
              )}
            </button>
          )}
        </div>
      )}

      <MapSettingsDrawer
        activeLayers={activeLayers}
        onToggleLayer={toggleLayer}
        resultsCount={businesses.length}
        savedCount={savedBusinesses.length}
        stageCounts={stageCounts}
        keywords={project?.keywords ?? []}
        activeKeywords={activeKeywords}
        onToggleKeyword={toggleKeyword}
        keywordCounts={keywordCounts}
      />

      {/* Standalone, precise SCIAN-code search — deliberately separate from
          the project's keyword/pill search above (own icon, own drawer,
          own state), never blended into it. */}
      <button
        type="button"
        onClick={() => {
          const c = mapRef.current?.getMap()?.getCenter();
          setAdvancedSearchCenter(c ? { lat: c.lat, lng: c.lng } : location);
          setAdvancedSearchOpen(true);
        }}
        aria-label="Búsqueda avanzada"
        className="absolute top-2.5 right-28 z-[60] flex h-9 w-9 items-center justify-center rounded-full bg-popover/95 shadow-soft backdrop-blur transition-colors duration-150 ease-in-out hover:bg-muted"
      >
        <Telescope className="h-4 w-4 text-primary" />
      </button>
      <AdvancedSearchDrawer
        open={advancedSearchOpen}
        onOpenChange={setAdvancedSearchOpen}
        mapCenter={advancedSearchCenter}
        onSubmit={runAdvancedSearch}
      />

      {advancedProgress && progressCardVisible && (
        <AdvancedSearchProgress
          completed={advancedProgress.completed}
          total={advancedProgress.total}
          found={advancedProgress.found}
          failed={advancedProgress.failed}
          running={advancedProgress.running}
          onDismiss={() => setProgressCardVisible(false)}
        />
      )}
      {/* Collapsed form of the card above — dismissing it never discards
          advancedProgress, so a still-running background search always has
          a way back to its status instead of just disappearing. */}
      {advancedProgress && !progressCardVisible && (
        <button
          type="button"
          onClick={() => setProgressCardVisible(true)}
          className="absolute top-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-soft"
          style={{ backgroundColor: ADVANCED_SEARCH_COLOR }}
        >
          {advancedProgress.running ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Telescope className="h-3 w-3" />
          )}
          {advancedProgress.running
            ? `${advancedProgress.completed}/${advancedProgress.total}`
            : `${advancedProgress.found} encontrados`}
        </button>
      )}

      {project && !showSearchArea && status === "loading" && (
        <MapStateBanner>Buscando negocios cerca de ti…</MapStateBanner>
      )}
      {project && !showSearchArea && status === "loaded" && businesses.length === 0 && (
        <MapStateBanner>
          <div className="flex flex-col items-center gap-2 text-center">
            <p>No encontramos negocios para &ldquo;{project.keywords.join(", ")}&rdquo; en esta zona.</p>
            <Button size="sm" variant="secondary" onClick={handleWiderRadiusSearch}>
              Buscar en un radio mayor
            </Button>
          </div>
        </MapStateBanner>
      )}
      {project && !showSearchArea && status === "error" && (
        <MapStateBanner>
          <div className="flex flex-col items-center gap-2 text-center">
            <p>No se pudieron cargar los negocios.</p>
            <Button size="sm" variant="secondary" onClick={handleRetrySearch}>
              Reintentar
            </Button>
          </div>
        </MapStateBanner>
      )}

      {project && (
        <ResultsDrawer
          open={resultsOpen && !suppressDrawer}
          onOpenChange={setResultsOpen}
          businesses={allResultsBusinesses}
          selected={selectedBusiness}
          onSelect={setSelectedBusiness}
          userLocation={location}
          leadsByBusinessId={leadsByBusinessId}
          savedIds={savedIds}
          onMarkVisited={onMarkVisited}
          onToggleSave={onToggleSave}
          onLeadUpdated={onLeadUpdated}
          onBusinessUpdated={handleBusinessUpdated}
          advancedIds={advancedIds}
        />
      )}
    </div>
  );
});
