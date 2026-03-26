import { getZone, getZoneTimeRemaining, getTotalTimeRemaining, getNextZone, TOTAL_SECONDS } from './zones.js';

export function createTimer() {
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
          elapsed: { total: TOTAL_SECONDS, ms: TOTAL_SECONDS * 1000 },
          zone: null,
          zoneRemaining: 0,
          totalRemaining: 0,
          progress: 1,
          finished: true,
        };
      }

      const elapsedMs = Date.now() - startTime;
      const elapsedSec = elapsedMs / 1000;

      if (elapsedSec >= TOTAL_SECONDS) {
        running = false;
        finished = true;
        // return the finished state
        return this.tick();
      }

      const zone = getZone(elapsedSec);
      const zoneRemaining = getZoneTimeRemaining(elapsedSec, zone);
      const totalRemaining = getTotalTimeRemaining(elapsedSec);
      const progress = elapsedSec / TOTAL_SECONDS;

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
      const currentZone = getZone(elapsedSec);
      if (!currentZone) return null;

      const nextZone = getNextZone(currentZone);
      if (!nextZone) {
        // In the last zone — skip to finish
        startTime = Date.now() - TOTAL_SECONDS * 1000;
        return null;
      }

      // Shift startTime backward so elapsed lands at the next zone's start
      startTime = Date.now() - nextZone.startSec * 1000;
      return nextZone;
    },

    isRunning() { return running; },
    isFinished() { return finished; },
  };
}
