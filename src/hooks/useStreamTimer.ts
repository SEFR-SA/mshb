import { useEffect, useState } from "react";

/** Returns a ticking "Playing for X minutes" string, or null if no startedAt is provided. */
export function useStreamTimer(startedAt: string | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!startedAt) { setLabel(null); return; }

    const compute = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000);
      setLabel(elapsed < 1 ? "Playing for less than a minute" : `Playing for ${elapsed} minute${elapsed === 1 ? "" : "s"}`);
    };

    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [startedAt]);

  return label;
}
