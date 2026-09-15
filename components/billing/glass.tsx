// Frosted-glass surface shared by every billing modal (paywall, the
// post-checkout "unlocked" celebration): a translucent --card (so it
// tracks light/dark automatically instead of a hardcoded white/black pair)
// over backdrop-blur, with a soft primary-tinted glow standing in for a
// generic icon-in-a-circle.
export const GLASS = "border-white/40 bg-card/75 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-card/60";

export function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-20 left-1/2 h-56 w-[30rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
    />
  );
}
