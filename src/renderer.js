import { ZONES, TOTAL_SECONDS } from './zones.js';

// ANSI escape helpers — zero dependencies
const ESC = '\x1b[';
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;
const CLEAR_SCREEN = `${ESC}2J${ESC}H`;
const ERASE_LINE = `${ESC}2K`;
const ALT_SCREEN_ON = `${ESC}?1049h`;
const ALT_SCREEN_OFF = `${ESC}?1049l`;
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const INVERT = `${ESC}7m`;

// Solarized Dark palette — Ethan Schoonover's spec
// Background tones
const BG_BASE03  = `${ESC}48;2;0;43;54m`;      // #002b36 — main background
const BG_BASE02  = `${ESC}48;2;7;54;66m`;       // #073642 — background highlights

// Foreground tones
const FG_BASE01  = `${ESC}38;2;88;110;117m`;    // #586e75 — comments, secondary
const FG_BASE0   = `${ESC}38;2;131;148;150m`;   // #839496 — body text
const FG_BASE1   = `${ESC}38;2;147;161;161m`;   // #93a1a1 — emphasis

// Accent colors — full Solarized spectrum
const FG_YELLOW  = `${ESC}38;2;181;137;0m`;     // #b58900
const FG_ORANGE  = `${ESC}38;2;203;75;22m`;     // #cb4b16
const FG_RED     = `${ESC}38;2;220;50;47m`;     // #dc322f
const FG_MAGENTA = `${ESC}38;2;211;54;130m`;    // #d33682
const FG_VIOLET  = `${ESC}38;2;108;113;196m`;   // #6c71c4
const FG_BLUE    = `${ESC}38;2;38;139;210m`;    // #268bd2
const FG_CYAN    = `${ESC}38;2;42;161;152m`;    // #2aa198
const FG_GREEN   = `${ESC}38;2;133;153;0m`;     // #859900
const BG_RED     = `${ESC}48;2;220;50;47m`;     // #dc322f

// ── UI copy — edit these to tweak display text ──
const LABELS = {
  phaseRemaining: (label, time) => `${label} remaining: ${time}`,
  totalRemaining: (time) => `total remaining: ${time}`,
  zoneIndicator: (label) => `[ ${label} ]`,
  skipFlash: (label) => `  >> ${label} >>  `,
  finishedTitle: '  25:00 — CYCLE COMPLETE  ',
  finishedHint: '  press any key to dismiss  ',
};

// Zone color mapping — each zone gets a distinct Solarized accent
const ZONE_STYLE = {
  'gather':     { fg: FG_CYAN,   accent: FG_CYAN   },  // cool, exploratory
  'buffer-in':  { fg: FG_YELLOW, accent: FG_YELLOW },  // caution, transition
  'work':       { fg: FG_ORANGE, accent: FG_ORANGE },  // urgency, heat
  'buffer-out': { fg: FG_YELLOW, accent: FG_YELLOW },  // wind-down
};

function moveTo(row, col) {
  return `${ESC}${row};${col}H`;
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[^m]*m/g, '');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function createRenderer() {
  const cols = () => process.stdout.columns || 80;
  const rows = () => process.stdout.rows || 24;

  function init() {
    process.stdout.write(ALT_SCREEN_ON + HIDE_CURSOR + CLEAR_SCREEN + BG_BASE03);
  }

  function destroy() {
    process.stdout.write(SHOW_CURSOR + RESET + ALT_SCREEN_OFF);
  }

  function drawFrame(state) {
    if (state.finished) {
      drawFinished();
      return;
    }

    const w = cols();
    const h = rows();
    const zone = state.zone;
    const style = ZONE_STYLE[zone.name];
    let out = '';

    // Write each line in-place: move to row, erase it, write content.
    // No CLEAR_SCREEN — no flicker.

    function writeLine(row, text, style) {
      out += moveTo(row, 1) + ERASE_LINE;
      if (text) {
        const col = Math.max(1, Math.floor((w - stripAnsi(text).length) / 2));
        out += moveTo(row, col) + (style || '') + text + RESET;
      }
    }

    // --- Top: elapsed time, centered ---
    const elapsed = formatTime(state.elapsed.total);
    const topRow = 2;
    writeLine(topRow, elapsed, style.fg);

    // --- Zone indicator row ---
    const zoneRow = topRow + 2;
    writeLine(zoneRow, LABELS.zoneIndicator(zone.label), style.accent);

    // --- Zone description ---
    const descRow = zoneRow + 1;
    writeLine(descRow, zone.description, FG_BASE0);

    // --- Progress bar ---
    const barRow = Math.floor(h / 2);
    const barPad = 4;
    const barWidth = w - barPad * 2;
    const filled = Math.floor(state.progress * barWidth);

    // Build bar with per-zone coloring — completed zones keep their color
    let bar = '';
    for (let i = 0; i < barWidth; i++) {
      if (i < filled) {
        const posSec = (i / barWidth) * TOTAL_SECONDS;
        const posZone = getBarZone(posSec);
        const posStyle = ZONE_STYLE[posZone.name];
        bar += posStyle.fg + posZone.char;
      } else {
        bar += FG_BASE01 + '·';
      }
    }
    bar += RESET;

    // Bar border top
    out += moveTo(barRow - 1, 1) + ERASE_LINE;
    out += moveTo(barRow - 1, barPad + 1) + FG_BASE01 + '─'.repeat(barWidth) + RESET;

    // Bar fill
    out += moveTo(barRow, 1) + ERASE_LINE;
    out += moveTo(barRow, barPad + 1) + bar;

    // Bar border bottom
    out += moveTo(barRow + 1, 1) + ERASE_LINE;
    out += moveTo(barRow + 1, barPad + 1) + FG_BASE01 + '─'.repeat(barWidth) + RESET;

    // --- Zone time remaining ---
    const remainRow = barRow + 3;
    const zoneRem = formatTime(state.zoneRemaining);
    writeLine(remainRow, LABELS.phaseRemaining(zone.label, zoneRem), style.accent);

    // --- Total time remaining ---
    const totalRow = remainRow + 1;
    const totalRem = formatTime(state.totalRemaining);
    writeLine(totalRow, LABELS.totalRemaining(totalRem), FG_BASE0);

    // --- Zone map at bottom ---
    const mapRow = h - 2;
    const mapParts = ZONES.map(z => {
      const dur = (z.endSec - z.startSec) / 60;
      const tag = `${z.char} ${z.label} ${dur}m`;
      if (z.name === zone.name) {
        return `${INVERT}${style.fg} ${tag} ${RESET}`;
      }
      return `${FG_BASE01}${DIM} ${tag} ${RESET}`;
    });
    const map = mapParts.join(`${FG_BASE01}│${RESET}`);
    const mapClean = stripAnsi(map);
    out += moveTo(mapRow, 1) + ERASE_LINE;
    out += moveTo(mapRow, Math.max(1, Math.floor((w - mapClean.length) / 2)));
    out += map;

    process.stdout.write(out);
  }

  // Glitch / mosaic finish screen
  let glitchFrame = 0;
  function drawFinished() {
    const w = cols();
    const h = rows();
    glitchFrame++;

    let out = CLEAR_SCREEN;

    // Undulating wave background — layered sine waves for organic movement
    const chars = ' ·:░▒▓█';
    const t = glitchFrame * 0.15;
    for (let row = 1; row <= h; row++) {
      out += moveTo(row, 1);
      let line = '';
      const rowTones = [];
      for (let col = 0; col < w; col++) {
        const x = col / w;
        const y = row / h;

        // Layer multiple sine waves at different frequencies and phases
        const wave1 = Math.sin(x * 6 + t) * Math.cos(y * 4 - t * 0.7);
        const wave2 = Math.sin((x + y) * 5 - t * 1.3) * 0.5;
        const wave3 = Math.cos(y * 8 + t * 0.5) * Math.sin(x * 3 - t) * 0.3;
        const v = (wave1 + wave2 + wave3) / 1.8; // normalize to roughly -1..1

        // Map to character density
        const ci = Math.floor((v + 1) / 2 * (chars.length - 1));
        line += chars[Math.max(0, Math.min(chars.length - 1, ci))];

        // Store value for color mapping
        rowTones.push(v);
      }

      // Full Solarized spectrum — warm peaks to cool troughs
      const spectrum = [FG_RED, FG_ORANGE, FG_YELLOW, FG_GREEN, FG_CYAN, FG_BLUE, FG_VIOLET, FG_MAGENTA];

      // Write char-by-char with per-cell color for smooth gradient
      let colored = '';
      for (let col = 0; col < w; col++) {
        const v = rowTones[col];
        // Map -1..1 to spectrum index, with a slow phase shift over time
        const phase = (v + 1) / 2 + t * 0.1;
        const si = Math.floor((phase * spectrum.length) % spectrum.length);
        const tone = line[col] === ' ' ? FG_BASE01 : spectrum[Math.abs(si) % spectrum.length];
        colored += tone + line[col];
      }
      out += colored + RESET;
    }

    // Central message punches through the noise
    const msg = LABELS.finishedTitle;
    const sub = LABELS.finishedHint;
    const centerRow = Math.floor(h / 2);
    const msgCol = Math.floor((w - msg.length) / 2);
    const subCol = Math.floor((w - sub.length) / 2);

    // Blink the message — red background, white text
    if (glitchFrame % 10 < 7) {
      out += moveTo(centerRow, msgCol);
      out += `${BG_RED}${BOLD}${FG_BASE1}${msg}${RESET}`;
    }
    out += moveTo(centerRow + 2, subCol);
    out += `${FG_BASE01}${DIM}${sub}${RESET}`;

    process.stdout.write(out);
  }

  // Flash zone label briefly on skip — inverted colors, 3 rapid frames
  let activeFlash = null;
  function flashZoneLabel(zone) {
    if (activeFlash) clearInterval(activeFlash);

    const w = cols();
    const h = rows();
    const style = ZONE_STYLE[zone.name];
    const label = LABELS.skipFlash(zone.label);
    const centerRow = Math.floor(h / 2);
    const col = Math.max(1, Math.floor((w - label.length) / 2));

    let frame = 0;
    activeFlash = setInterval(() => {
      let out = moveTo(centerRow, col);
      if (frame % 2 === 0) {
        out += `${INVERT}${style.fg}${BOLD}${label}${RESET}`;
      } else {
        out += `${style.fg}${BOLD}${label}${RESET}`;
      }
      process.stdout.write(out);
      frame++;
      if (frame >= 4) {
        clearInterval(activeFlash);
        activeFlash = null;
      }
    }, 100);
  }

  return { init, destroy, drawFrame, flashZoneLabel };
}

// Helper: determine which zone a given second falls into (for bar rendering)
function getBarZone(sec) {
  for (const z of ZONES) {
    if (sec < z.endSec) return z;
  }
  return ZONES[ZONES.length - 1];
}
