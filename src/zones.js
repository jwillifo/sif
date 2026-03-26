// Zone definitions for the 25-minute SIF triage cycle.
// Each zone has a name, start/end in seconds, a fill character, and a label.
// Timing is absolute from 00:00.

export const ZONES = [
  {
    name: 'gather',
    label: 'GATHER',
    char: '░',
    startSec: 0,
    endSec: 15 * 60,       // 00:00 → 14:59
    description: 'context assembly - client notes - screenshots',
  },
  {
    name: 'buffer-in',
    label: 'BUFFER',
    char: '▒',
    startSec: 15 * 60,
    endSec: 17 * 60,       // 15:00 → 16:59
    description: 'problem write-up - similar issues - historical insights',
  },
  {
    name: 'work',
    label: 'WORK',
    char: '▓',
    startSec: 17 * 60,
    endSec: 22 * 60,       // 17:00 → 21:59
    description: 'work — RESPOND || RESOLVE',
  },
  {
    name: 'buffer-out',
    label: 'CLOSE',
    char: '▒',
    startSec: 22 * 60,
    endSec: 25 * 60,       // 22:00 → 25:00
    description: 'admin matrix - DO || DECIDE || DELEGATE || DELETE',
  },
];

export const TOTAL_SECONDS = 25 * 60;

export function getZone(elapsedSec) {
  for (const zone of ZONES) {
    if (elapsedSec < zone.endSec) return zone;
  }
  // past end
  return null;
}

export function getNextZone(currentZone) {
  const idx = ZONES.indexOf(currentZone);
  if (idx < 0 || idx >= ZONES.length - 1) return null;
  return ZONES[idx + 1];
}

export function getZoneTimeRemaining(elapsedSec, zone) {
  return Math.max(0, zone.endSec - elapsedSec);
}

export function getTotalTimeRemaining(elapsedSec) {
  return Math.max(0, TOTAL_SECONDS - elapsedSec);
}
