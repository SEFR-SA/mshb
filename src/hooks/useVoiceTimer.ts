import { useEffect, useState } from "react";

/** Ticking elapsed timer from a start time. Returns "MM:SS" (or "H:MM:SS" over 1 hour), or null. */
export function useVoiceTimer(startTime: string | number | Date | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  const key = startTime ? String(startTime) : null;

  useEffect(() => {
    if (!key) { setLabel(null); return; }

    const compute = () => {
      const totalSecs = Math.max(0, Math.floor((Date.now() - new Date(key).getTime()) / 1000));
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      const mm = String(m).padStart(2, "0");
      const ss = String(s).padStart(2, "0");
      setLabel(h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`);
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [key]);

  return label;
}
