// Organic "liquid light" theme transition.
// The new theme spreads from the toggle button as a living blob (View Transitions API +
// WAAPI polygon clip-path, interpolated by the browser), traced by a glowing rim and a
// trail of particles drawn on a lightweight live canvas layer.
//
// Performance notes:
// - The clip-path is precomputed once and handed to WAAPI: no per-frame style writes.
// - The canvas never uses shadowBlur or per-frame gradients (both are very expensive at
//   full-screen size). Glow = a few stacked strokes; particles = pre-rendered sprites.
// - The canvas renders at 1x: everything on it is soft light, so extra pixels buy nothing.

const DURATION = 1100;
const POINTS = 64;
const KEYFRAMES = 36;
const MAX_PARTICLES = 110;

const PALETTES = {
  dark: {
    rim: [150, 215, 255],
    core: [235, 248, 255],
    particles: [[200, 235, 255], [160, 200, 255], [255, 255, 255], [0, 242, 254]],
    drift: -1, // stars stay behind, inside the night
  },
  light: {
    rim: [255, 196, 120],
    core: [255, 244, 222],
    particles: [[255, 214, 150], [255, 236, 190], [255, 180, 120], [255, 255, 240]],
    drift: 1, // motes float ahead, into the remaining dark
  },
};

const TAU = Math.PI * 2;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

// Precomputed unit circle, shared by every frame.
const COS = new Float32Array(POINTS);
const SIN = new Float32Array(POINTS);
for (let i = 0; i < POINTS; i++) {
  COS[i] = Math.cos((i / POINTS) * TAU);
  SIN[i] = Math.sin((i / POINTS) * TAU);
}

function createBlob(origin, width, height) {
  const far = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(width - origin.x, origin.y),
    Math.hypot(origin.x, height - origin.y),
    Math.hypot(width - origin.x, height - origin.y),
  );
  const maxRadius = far * 1.18 + 40;
  // Layered sine "noise" with random phases: smooth, organic, different on every toggle.
  const waves = [
    { k: 3, w: 0.5, s: 1.6 },
    { k: 5, w: 0.3, s: -2.3 },
    { k: 8, w: 0.16, s: 3.1 },
  ].map((wave) => ({ ...wave, phase: Math.random() * TAU }));

  const xs = new Float32Array(POINTS);
  const ys = new Float32Array(POINTS);

  // Fills xs/ys in place (no allocation per frame).
  const shape = (t) => {
    const base = maxRadius * easeInOutCubic(t);
    const amp = 0.13 * Math.pow(Math.sin(Math.PI * clamp01(t * 1.15)), 0.7) + 0.02;
    for (let i = 0; i < POINTS; i++) {
      const theta = (i / POINTS) * TAU;
      let n = 0;
      for (let j = 0; j < waves.length; j++) {
        const { k, w, s, phase } = waves[j];
        n += w * Math.sin(k * theta + phase + s * t * Math.PI);
      }
      const r = Math.max(0, base * (1 + amp * n));
      xs[i] = origin.x + COS[i] * r;
      ys[i] = origin.y + SIN[i] * r;
    }
  };

  const polygon = (t) => {
    shape(t);
    let s = 'polygon(';
    for (let i = 0; i < POINTS; i++) s += `${i ? ',' : ''}${xs[i].toFixed(1)}px ${ys[i].toFixed(1)}px`;
    return s + ')';
  };

  return { shape, polygon, xs, ys };
}

// Soft round sprite per color, rendered once per transition.
function makeSprite(color, size = 32) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const h = size / 2;
  const grad = g.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0, rgba(color, 1));
  grad.addColorStop(0.25, rgba(color, 0.65));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  // Faint four-point glint baked in.
  g.strokeStyle = rgba(color, 0.35);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(size, h);
  g.moveTo(h, 0);
  g.lineTo(h, size);
  g.stroke();
  return c;
}

function createFxCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.className = 'theme-vt-fx';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

function drawFrame(ctx, state, t, now) {
  const { blob, palette, particles, origin, width, height, sprites, rippleSprite } = state;
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';

  // 1. Tactile ripple bursting from the button (sprite, no per-frame gradient).
  const rippleT = clamp01((now - state.start) / 520);
  if (rippleT < 1) {
    const e = 1 - Math.pow(1 - rippleT, 3);
    const size = 120 + e * 140;
    ctx.globalAlpha = 0.6 * (1 - rippleT);
    ctx.drawImage(rippleSprite, origin.x - size / 2, origin.y - size / 2, size, size);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 8 + e * 70, 0, TAU);
    ctx.strokeStyle = rgba(palette.core, 0.55 * (1 - rippleT));
    ctx.lineWidth = 2.5 * (1 - rippleT) + 0.5;
    ctx.stroke();
  }

  // 2. Glowing rim: stacked strokes fake the blur at a fraction of the cost.
  if (t > 0 && t < 1) {
    blob.shape(t);
    const { xs, ys } = blob;
    const fade = Math.min(1, t * 6) * Math.min(1, (1 - t) * 4);
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < POINTS; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(palette.rim, 0.07 * fade);
    ctx.lineWidth = 26;
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.rim, 0.14 * fade);
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = rgba(palette.core, 0.85 * fade);
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Spawn particles on visible parts of the rim.
    const spawn = Math.min(MAX_PARTICLES - particles.length, Math.round(5 * fade));
    for (let n = 0; n < spawn; n++) {
      const i = (Math.random() * POINTS) | 0;
      const x = xs[i];
      const y = ys[i];
      if (x < -20 || y < -20 || x > width + 20 || y > height + 20) continue;
      const speed = 0.02 + Math.random() * 0.06;
      const dir = palette.drift * (0.4 + Math.random() * 0.6);
      particles.push({
        x,
        y,
        vx: COS[i] * speed * dir + (Math.random() - 0.5) * 0.03,
        vy: SIN[i] * speed * dir + (Math.random() - 0.5) * 0.03 - 0.008,
        born: now,
        life: 650 + Math.random() * 900,
        size: 3 + Math.random() * Math.random() * 12,
        sprite: sprites[(Math.random() * sprites.length) | 0],
        twinkle: Math.random() * TAU,
      });
    }
  }

  // 3. Particles: twinkle, drift, fade (swap-remove, no splice).
  const dt = Math.min(48, now - (state.lastNow ?? now));
  state.lastNow = now;
  const friction = Math.pow(0.985, dt / 16.7);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const age = (now - p.born) / p.life;
    if (age >= 1) {
      particles[i] = particles[particles.length - 1];
      particles.pop();
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= friction;
    p.vy *= friction;
    ctx.globalAlpha = Math.sin(Math.PI * age) * (0.6 + 0.4 * Math.sin(p.twinkle + now * 0.018));
    const s = p.size * (1 - age * 0.4);
    ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function getOrigin(event) {
  const el = event?.currentTarget;
  if (el?.getBoundingClientRect) {
    const r = el.getBoundingClientRect();
    if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  if (event && typeof event.clientX === 'number' && (event.clientX || event.clientY)) {
    return { x: event.clientX, y: event.clientY };
  }
  return { x: window.innerWidth - 48, y: 40 };
}

let running = false;
let queued = null;

/**
 * @param {object} opts
 * @param {Event} [opts.event]   click event from the toggle (used as the origin)
 * @param {{x:number,y:number}} [opts.from]  explicit origin, overrides the event
 * @param {'dark'|'light'} opts.to  theme being switched to
 * @param {() => void} opts.apply   synchronously applies the new theme to the DOM
 */
export function runThemeTransition({ event, from, to, apply }) {
  const root = document.documentElement;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // A click during a running transition is replayed when it ends instead of being lost.
  // The caller's `apply` reads the theme at call time, so only the latest request is kept.
  if (running) {
    queued = { origin: getOrigin(event) };
    return;
  }
  if (!document.startViewTransition || reduced || document.visibilityState !== 'visible') {
    apply();
    return;
  }

  running = true;
  // A leftover canvas still carrying the transition name makes the browser skip the next
  // transition (duplicate view-transition-name), which looked like an instant theme swap.
  document.querySelectorAll('.theme-vt-fx').forEach((el) => el.remove());

  const origin = from ?? getOrigin(event);
  const width = window.innerWidth;
  const height = window.innerHeight;
  const blob = createBlob(origin, width, height);
  const palette = PALETTES[to];
  const { canvas, ctx } = createFxCanvas();

  // Everything expensive is prepared before the old-state snapshot is taken.
  const frames = [];
  for (let i = 0; i <= KEYFRAMES; i++) frames.push({ clipPath: blob.polygon(i / KEYFRAMES) });
  frames[frames.length - 1] = { clipPath: 'inset(0)' };

  const state = {
    blob,
    palette,
    particles: [],
    origin,
    width,
    height,
    start: performance.now(),
    sprites: palette.particles.map((c) => makeSprite(c)),
    rippleSprite: makeSprite(palette.core, 64),
  };

  root.classList.add('theme-vt-active');

  let applied = false;
  const transition = document.startViewTransition(() => {
    root.classList.add('theme-switching');
    apply();
    applied = true;
    document.body.appendChild(canvas);
  });

  let raf = 0;
  let clipAnim = null;

  const loop = (now) => {
    const t = clipAnim ? clamp01((clipAnim.currentTime ?? 0) / DURATION) : 0;
    drawFrame(ctx, state, t, now);
    raf = requestAnimationFrame(loop);
  };

  transition.ready
    .then(() => {
      clipAnim = root.animate(frames, {
        duration: DURATION,
        easing: 'linear',
        fill: 'both',
        pseudoElement: '::view-transition-new(root)',
      });
      state.start = performance.now();
      raf = requestAnimationFrame(loop);
    })
    .catch(() => {});

  transition.finished.finally(() => {
    // If the browser skipped the transition before running the callback, still switch.
    if (!applied) apply();
    root.classList.remove('theme-vt-active', 'theme-switching');
    canvas.style.viewTransitionName = 'none';
    running = false;
    // Let the remaining particles finish over the settled page, then clean up.
    canvas.style.transition = 'opacity 600ms ease';
    requestAnimationFrame(() => (canvas.style.opacity = '0'));
    setTimeout(() => {
      cancelAnimationFrame(raf);
      canvas.remove();
    }, 650);

    if (queued) {
      const next = queued;
      queued = null;
      requestAnimationFrame(() => onQueued?.(next.origin));
    }
  });
}

// The provider registers how to replay a queued toggle (it knows the current theme).
let onQueued = null;
export function setQueuedToggleHandler(fn) {
  onQueued = fn;
}
