"use client";

import type { ReactNode } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { DecorativeAuthMap } from "./decorative-auth-map";

export function AuthLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-sheet px-4">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full">
      <div className="relative flex-1">
        <DecorativeAuthMap />
        {/* Blends the map into the form panel's bg-sheet instead of a hard
            seam between them — same token on both sides of the edge, so
            light/dark just falls out of --sheet without a separate check. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-sheet to-transparent" aria-hidden />
      </div>
      <div className="flex w-full max-w-lg shrink-0 items-center justify-center bg-sheet px-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
