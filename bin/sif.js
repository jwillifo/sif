#!/usr/bin/env node

// Made with care and thoughtfulness by John Williford and Claude Code

import { createTimer } from '../src/timer.js';
import { createRenderer } from '../src/renderer.js';

const timer = createTimer();
const renderer = createRenderer();

// --- Keypress handling ---
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (key) => {
  // Ctrl+C always exits
  if (key === '\x03') {
    shutdown();
    return;
  }

  // If finished, any key dismisses
  if (timer.isFinished()) {
    shutdown();
    return;
  }

  // q quits early
  if (key === 'q' || key === 'Q') {
    shutdown();
    return;
  }

  // Spacebar skips forward to next zone
  if (key === ' ') {
    const nextZone = timer.skipToNextZone();
    if (nextZone) {
      renderer.flashZoneLabel(nextZone);
    }
    // If null, we jumped to finish — next tick() handles it
    return;
  }
});

function shutdown() {
  clearInterval(loop);
  renderer.destroy();
  process.exit(0);
}

// --- Clean exit on signals ---
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// --- Go ---
renderer.init();
timer.start();

// 1fps — redraws once per second, mm:ss granularity
const TICK_MS = 1000;
let loop = setInterval(tick, TICK_MS);

function tick() {
  const state = timer.tick();
  if (!state) return;
  renderer.drawFrame(state);

  // When finished, speed up the loop for glitch animation
  if (state.finished && TICK_MS !== 150) {
    clearInterval(loop);
    // ~7fps for mosaic effect
    loop = setInterval(tick, 150);
  }
}
