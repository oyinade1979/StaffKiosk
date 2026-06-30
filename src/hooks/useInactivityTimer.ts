import { useEffect, useRef, useCallback } from "react";
import { INACTIVITY_TIMEOUT_MS } from "@/constants";

export function useInactivityTimer(active: boolean, onTimeout: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, INACTIVITY_TIMEOUT_MS);
  }, [onTimeout]);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, reset]);
}
