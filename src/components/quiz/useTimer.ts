import { useEffect, useRef, useState } from 'react';

// Computes remaining time from a wall-clock deadline so tab throttling,
// sleep, and page refreshes never desync the countdown.
export function useTimer(endsAt: number | null, onExpire: () => void): number | null {
  const [remainingSec, setRemainingSec] = useState<number | null>(() =>
    endsAt === null ? null : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (endsAt === null) {
      setRemainingSec(null);
      return;
    }
    expiredRef.current = false;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };

    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  return remainingSec;
}

export function formatTime(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
