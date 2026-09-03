export function MyLocationDot() {
  return (
    <div className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute h-4 w-4 animate-ping rounded-full bg-primary/40" />
      <span className="relative h-3 w-3 rounded-full border-2 border-white bg-primary shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
    </div>
  );
}
