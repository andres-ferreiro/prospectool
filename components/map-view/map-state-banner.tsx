interface MapStateBannerProps {
  children: React.ReactNode;
}

export function MapStateBanner({ children }: MapStateBannerProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-36 z-10 flex justify-center px-6">
      <div className="pointer-events-auto rounded-xl bg-popover/95 px-4 py-2.5 text-sm text-foreground shadow-soft backdrop-blur">
        {children}
      </div>
    </div>
  );
}
