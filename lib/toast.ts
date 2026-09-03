"use client";

export type ToastVariant = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listeners: Listener[] = [];

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast({ title, description, variant = "default" }: ToastInput) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, title, description, variant }];
  emit();
  setTimeout(() => dismissToast(id), 4500);
  return id;
}
