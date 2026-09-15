"use client";

// Same pub/sub shape as lib/toast.ts — a single <PaywallModal /> (rendered
// once in AppShell) subscribes and shows itself, so any component anywhere
// in the tree can trigger the paywall with openPaywall("reason") instead of
// navigating to a page and unmounting whatever's currently on screen.

import type { LockedResultStats } from "./billing/limits";

export type PaywallReason = "proyecto" | "crm" | "resultados" | "calendario";

export interface PaywallState {
  reason: PaywallReason;
  /** Only ever set for "resultados" — what's actually behind the lock in
   *  the search that triggered it, so the modal can show a concrete "X
   *  correos y Y teléfonos más" instead of a generic pitch. */
  stats: LockedResultStats | null;
}

type Listener = (state: PaywallState | null) => void;

let current: PaywallState | null = null;
let listeners: Listener[] = [];

function emit() {
  for (const listener of listeners) listener(current);
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  listener(current);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function openPaywall(reason: PaywallReason, stats: LockedResultStats | null = null) {
  current = { reason, stats };
  emit();
}

export function closePaywall() {
  current = null;
  emit();
}
