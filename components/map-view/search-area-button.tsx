import { Lock, RotateCw } from "lucide-react";

interface SearchAreaButtonProps {
  onClick: () => void;
  /** True while the advanced-search progress banner is also showing —
   * pushes this button down below it so the two don't overlap (the
   * banner's height varies with its content, so this is a fixed offset
   * generous enough to clear it rather than a measured one). */
  pushedDown?: boolean;
  /** Free users get one search per project free; every search after that
   *  opens the paywall instead of running — same lock affordance as
   *  BottomNav's CRM tab, so clicking isn't a surprise. */
  locked?: boolean;
}

export function SearchAreaButton({ onClick, pushedDown, locked }: SearchAreaButtonProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-6 ${pushedDown ? "top-[13.5rem]" : "top-36"}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-popover/95 px-4 py-2.5 text-sm font-medium text-primary shadow-soft backdrop-blur transition-colors duration-150 ease-in-out hover:bg-muted"
      >
        <RotateCw className="h-4 w-4" />
        Buscar en esta área
        {locked && <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      </button>
    </div>
  );
}
