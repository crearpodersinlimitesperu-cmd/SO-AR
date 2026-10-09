import { useEffect, useState } from 'react';
import { getMissionWindow } from '../../../functions-imo/missionWindow.mjs';

export function useMissionWindow(openedAt, live = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!openedAt || !live) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [openedAt, live]);
  return getMissionWindow(openedAt, now);
}
