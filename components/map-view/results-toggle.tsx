import { List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsToggleProps {
  count: number;
  onClick: () => void;
}

export function ResultsToggle({ count, onClick }: ResultsToggleProps) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      className="gap-1.5 rounded-full shadow-soft"
    >
      <List className="h-4 w-4" />
      {count} {count === 1 ? "resultado" : "resultados"}
    </Button>
  );
}
