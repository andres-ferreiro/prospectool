import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** "lg" for a page/panel-level empty state (icon circle, bold title,
   *  room for a CTA). "sm" for a compact placeholder inside a list, column,
   *  or filtered view — no circle, quieter type. */
  size?: "sm" | "lg";
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, size = "lg", className }: EmptyStateProps) {
  if (size === "sm") {
    return (
      <div className={cn("flex flex-col items-center gap-1.5 py-6 text-center", className)}>
        <Icon className="h-4 w-4 text-muted-foreground/70" aria-hidden />
        <p className="text-xs text-muted-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-3 py-10 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="max-w-64 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
