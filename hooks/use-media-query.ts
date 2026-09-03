"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Desktop, landscape tablets, and any portrait tablet wide enough — a pure
// width check, so it covers all of those without branching on orientation.
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
