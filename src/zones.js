// Zone definitions for the SIF triage cycle.
// Proportions are fixed ratios of a 25-minute base; total duration scales proportionally.

const ZONE_TEMPLATES = [
  {
    name: 'gather',
    label: 'GATHER',
    char: '░',
    ratio: 15 / 25,
    description: 'context assembly - client notes - screenshots',
  },
  {
    name: 'buffer-in',
    label: 'BUFFER',
    char: '▒',
    ratio: 2 / 25,
    description: 'problem write-up - similar issues - historical insights',
  },
  {
    name: 'work',
    label: 'WORK',
    char: '▓',
    ratio: 5 / 25,
    description: 'work — RESPOND || RESOLVE',
  },
  {
    name: 'buffer-out',
    label: 'CLOSE',
    char: '▒',
    ratio: 3 / 25,
    description: 'admin matrix - DO || DECIDE || DELEGATE || DELETE',
  },
];

export function createZones(totalMinutes = 25) {
  const totalSeconds = totalMinutes * 60;
  let cursor = 0;

  const zones = ZONE_TEMPLATES.map(t => {
    const duration = t.ratio * totalSeconds;
    const zone = {
      name: t.name,
      label: t.label,
      char: t.char,
      description: t.description,
      startSec: cursor,
      endSec: cursor + duration,
    };
    cursor += duration;
    return zone;
  });

  return { zones, totalSeconds };
}

export function getZone(zones, elapsedSec) {
  for (const zone of zones) {
    if (elapsedSec < zone.endSec) return zone;
  }
  return null;
}

export function getNextZone(zones, currentZone) {
  const idx = zones.indexOf(currentZone);
  if (idx < 0 || idx >= zones.length - 1) return null;
  return zones[idx + 1];
}

export function getZoneTimeRemaining(elapsedSec, zone) {
  return Math.max(0, zone.endSec - elapsedSec);
}

export function getTotalTimeRemaining(elapsedSec, totalSeconds) {
  return Math.max(0, totalSeconds - elapsedSec);
}
