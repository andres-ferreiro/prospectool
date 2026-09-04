"use client";

import type { ReactNode } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { DecorativeAuthMap } from "./decorative-auth-map";

export function AuthLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-sheet px-4">
        <div className="w-full max-w-sm rounded-2xl bg-popover p-6 shadow-soft">{children}</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-sheet">
      <div className="absolute inset-0 z-0">
        <DecorativeAuthMap />
      </div>
      <div className="absolute top-1/2 right-16 z-10 w-full max-w-sm -translate-y-1/2 rounded-2xl bg-popover p-8 shadow-soft">
        {children}
      </div>
    </main>
  );
}
