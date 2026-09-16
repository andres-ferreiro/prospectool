"use client";

import { Input } from "@/components/ui/input";

// `autoComplete="one-time-code"` is what lets iOS and Android offer the code
// straight from the notification — the main reason a 6-digit code beats a
// magic link on mobile, where a link would open outside the installed PWA.
// The text-indent cancels the trailing letter-space so the digits stay
// optically centred rather than sitting slightly left.
export function CodeInput({ name = "code", disabled = false }: { name?: string; disabled?: boolean }) {
  return (
    <Input
      id={name}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      autoFocus
      disabled={disabled}
      aria-label="Código de 6 dígitos"
      placeholder="000000"
      className="h-14 rounded-xl border-0 text-center font-mono text-2xl tracking-[0.4em] shadow-sm [text-indent:0.4em]"
    />
  );
}
