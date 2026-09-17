/** A project's own search, re-run whenever the project opens without fresh
 *  cached results — see lib/project-base-search.ts. */
export interface ProjectBaseSearch {
  /** Null until the onboarding location step picks a place. */
  center: { lat: number; lng: number } | null;
  radiusM: number;
  entidad: string | null;
  municipio: string | null;
  /** AI-picked SCIAN categories; empty for keyword-only projects. */
  scianCodes: string[];
}

export interface ProjectRow {
  id: string;
  user_id: string;
  product_service: string;
  keywords: string[];
  base_search: ProjectBaseSearch | null;
  created_at: string;
}

export interface BusinessRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  // Null for businesses sourced from SIEM (source: "siem"), which has no
  // coordinates — only text address fields. Every DENUE-sourced business
  // still has real coordinates.
  lat: number | null;
  lng: number | null;
  source: string;
  source_id: string | null;
  raw_json: unknown;
  created_at: string;
}

export interface DenueSearchRow {
  id: string;
  keyword: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  fetched_at: string;
  result_count: number;
}

// The CRM pipeline. "Saved" businesses are a separate wishlist (see
// SavedBusinessRow below) — a lead only exists once a business has actually
// been visited/contacted.
export const STAGES = ["contacted", "interested", "negotiating", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  contacted: "Contactado",
  interested: "Interesado",
  negotiating: "Negociando",
  won: "Ganado",
  lost: "Perdido",
};

// Shared between map pins, the CRM board, and status badges so a stage (or
// the saved wishlist) always reads as the same color everywhere.
export const STAGE_COLORS: Record<Stage, string> = {
  // Was the same blue as plain (non-CRM) search-result pins/primary UI —
  // made "contacted" leads indistinguishable from businesses with no lead
  // at all on the map. Teal reads as a distinct color from every other
  // stage, the saved-wishlist amber, and the advanced-search indigo.
  contacted: "#14b8a6",
  interested: "#a855f7",
  negotiating: "#f97316",
  won: "#22c55e",
  lost: "#ef4444",
};
export const SAVED_COLOR = "#f59e0b";

// A project's keywords are user-defined/unbounded, so they can't get a fixed
// color map like stages — cycle through this palette by list position
// instead. Purely a UI identifier (which keyword-filter row is which), not
// used to recolor map pins.
export const KEYWORD_COLORS = [
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#f43f5e",
  "#8b5cf6",
  "#eab308",
];

export function keywordColor(index: number): string {
  return KEYWORD_COLORS[index % KEYWORD_COLORS.length];
}

export interface LeadRow {
  id: string;
  project_id: string;
  user_id: string;
  business_id: string;
  stage: Stage;
  notes: string | null;
  created_at: string;
}

// Contacts included so CRM list/card views can show and search them without
// a per-lead fetch — see listLeadsForProject in lib/db/leads.ts.
export type LeadWithBusiness = LeadRow & { business: BusinessRow; contacts: LeadContactRow[] };

// One entry per stage transition a lead has gone through — the CRM timeline.
export interface LeadActivityRow {
  id: string;
  lead_id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  created_at: string;
}

// A lead can have more than one point of contact (e.g. a receptionist and
// an owner) — this is intentionally one-to-many, not fields on LeadRow.
export interface LeadContactRow {
  id: string;
  lead_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

// A lightweight bookmark for a business the user plans to visit/contact —
// intentionally not part of the CRM pipeline above.
export interface SavedBusinessRow {
  id: string;
  project_id: string;
  user_id: string;
  business_id: string;
  created_at: string;
}

export type SavedBusinessWithBusiness = SavedBusinessRow & { business: BusinessRow };

// Appointments tied to a project and, optionally, a lead and/or business —
// see supabase/migrations/20260905140000_appointments.sql.
export const APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
  no_show: "#f97316",
};

export interface AppointmentRow {
  id: string;
  user_id: string;
  project_id: string;
  lead_id: string | null;
  business_id: string | null;
  title: string;
  notes: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  created_at: string;
}

export type AppointmentWithRelations = AppointmentRow & {
  business: BusinessRow | null;
  lead: LeadRow | null;
};

// Billing state, one row per user — see supabase/migrations/20260904190000_billing_subscriptions.sql.
export type BillingPlan = "monthly" | "yearly";

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: BillingPlan | null;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}
