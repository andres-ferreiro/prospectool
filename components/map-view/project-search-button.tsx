import { History } from "lucide-react";

interface ProjectSearchButtonProps {
  onClick: () => void;
}

// Brings back the project's own saved search (area + keywords + AI
// categories) after exploring elsewhere. Never paywalled: it re-shows
// results the project already had, it isn't a new search.
export function ProjectSearchButton({ onClick }: ProjectSearchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex items-center gap-2 rounded-full bg-popover/95 px-4 py-2.5 text-sm font-medium text-foreground shadow-soft backdrop-blur transition-colors duration-150 ease-in-out hover:bg-muted"
    >
      <History className="h-4 w-4 text-primary" />
      Búsqueda del proyecto
    </button>
  );
}
