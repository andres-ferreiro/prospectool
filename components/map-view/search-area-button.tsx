import { Lock, RotateCw } from "lucide-react";

interface SearchAreaButtonProps {
  onClick: () => void;
  /** Free users get one search per project free; every search after that
   *  opens the paywall instead of running — same lock affordance as
   *  BottomNav's CRM tab, so clicking isn't a surprise. */
  locked?: boolean;
}

// Positioned by its container in business-map.tsx, which it shares with
// ProjectSearchButton.
export function SearchAreaButton({ onClick, locked }: SearchAreaButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex items-center gap-2 rounded-full bg-popover/95 px-4 py-2.5 text-sm font-medium text-primary shadow-soft backdrop-blur transition-colors duration-150 ease-in-out hover:bg-muted"
    >
      <RotateCw className="h-4 w-4" />
      Buscar en esta área
      {locked && <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />}
    </button>
  );
}
