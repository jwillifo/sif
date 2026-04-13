import { getZone, getZoneTimeRemaining, getTotalTimeRemaining, getNextZone } from './zones.js';

export function createTimer(config) {
  const { zones, totalSeconds } = config;
  let startTime = null;
  let running = false;
  let finished = false;

  return {
    start() {
      startTime = Date.now();
      running = true;
      finished = false;
    },

    tick() {
      if (!startTime) return null;

      // Keep returning finished state so the glitch animation can loop
      if (finished) {
        return {
          elapsed: { total: totalSeconds, ms: totalSeconds * 1000 },
          zone: null,
          zoneRemaining: 0,
          totalRemaining: 0,
          progress: 1,
          finished: true,
        };
      }

      const elapsedMs = Date.now() - startTime;
      const elapsedSec = elapsedMs / 1000;

      if (elapsedSec >= totalSeconds) {
        running = false;
        finished = true;
        return this.tick();
      }

      const zone = getZone(zones, elapsedSec);
      const zoneRemaining = getZoneTimeRemaining(elapsedSec, zone);
      const totalRemaining = getTotalTimeRemaining(elapsedSec, totalSeconds);
      const progress = elapsedSec / totalSeconds;

      return {
        elapsed: { total: elapsedSec, ms: elapsedMs },
        zone,
        zoneRemaining,
        totalRemaining,
        progress,
        finished: false,
      };
    },

    skipToNextZone() {
      if (!startTime || finished) return null;
      const elapsedSec = (Date.now() - startTime) / 1000;
      const currentZone = getZone(zones, elapsedSec);
      if (!currentZone) return null;

      const nextZone = getNextZone(zones, currentZone);
      if (!nextZone) {
        startTime = Date.now() - totalSeconds * 1000;
        return null;
      }

      startTime = Date.now() - nextZone.startSec * 1000;
      return nextZone;
    },

    isRunning() { return running; },
    isFinished() { return finished; },
  };
}
