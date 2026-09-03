import { LocateFixed } from "lucide-react";

interface LocateButtonProps {
  onClick: () => void;
}

export function LocateButton({ onClick }: LocateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ir a mi ubicación"
      className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-popover shadow-soft transition-colors duration-150 ease-in-out hover:bg-muted"
    >
      <LocateFixed className="h-5 w-5 text-primary" strokeWidth={1.75} />
    </button>
  );
}
