// Hand-drawn canvas primitives shared by every living sketch.
//
// Drawing rules (they mirror how Mario sketches by hand):
// - Wobble comes from seeded jitter, so a shape keeps the same wobble while it
//   moves instead of shimmering frame to frame.
// - Stroke endpoints are never jittered and box corners are shared by the two
//   sides that meet there: lines end in a point, corners never overshoot into
//   a cross.

export type Pt = [number, number];
export type Pose = [number, number, number]; // x, y, heading

export type SceneName = "juggle" | "foci" | "lasso" | "touch" | "pave";

// Scenes visitors can drag around (they also get a "start over" control).
export const DRAGGABLE: readonly SceneName[] = ["foci"];

export type Theme = {
  bg: string;
  ink: string;
  accent: string;
  faint: string;
  amp: number;
  w: number;
  hand: (px: number) => string;
};

export const NOTEBOOK: Theme = {
  bg: "#f6f1e7",
  ink: "#141210",
  accent: "#a33a22",
  faint: "rgba(20, 18, 16, 0.55)",
  amp: 1.1,
  w: 1.6,
  hand: px => `500 ${Math.round(px * 1.2)}px Caveat, cursive`,
};

export interface Scene {
  // Time shown as a still frame when the visitor prefers reduced motion.
  still: number;
  draw(c: CanvasRenderingContext2D, W: number, H: number, t: number, th: Theme): void;
}

export interface Draggable extends Scene {
  drag: unknown;
  pick(x: number, y: number, W: number, H: number): boolean;
  move(x: number, y: number, W: number, H: number): void;
  reset(): void;
}

export function isDraggable(s: Scene): s is Draggable {
  return "pick" in s;
}

export type StrokeOpts = {
  color: string;
  w?: number;
  amp?: number;
  seed?: number;
  alpha?: number;
  dash?: number[];
  // Fraction of the polyline to draw, for strokes that are being drawn on.
  frac?: number;
};

export type ShapeOpts = StrokeOpts & {
  rot?: number;
  fill?: string;
  fillAlpha?: number;
};

// ---------- math ----------

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, s: number) => a + (b - a) * s;
export const lerpP = (p: Pt, q: Pt, s: number): Pt => [lerp(p[0], q[0], s), lerp(p[1], q[1], s)];
export const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
// Progress of u through the window [a, b], clamped to 0..1.
export const ph = (u: number, a: number, b: number) => clamp((u - a) / (b - a));

// Catmull-Rom through control points, resampled to n points evenly spaced by arc length.
export function smooth(ctrl: Pt[], n: number): Pt[] {
  const dense: Pt[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[i - 1] || ctrl[i], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[i + 2] || p2;
    for (let j = 0; j < 20; j++) {
      const t = j / 20, t2 = t * t, t3 = t2 * t;
      const k = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([k(p0[0], p1[0], p2[0], p3[0]), k(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(ctrl[ctrl.length - 1]);
  const L = [0];
  for (let i = 1; i < dense.length; i++) L.push(L[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (L[L.length - 1] * i) / (n - 1);
    while (j < L.length - 2 && L[j + 1] < s) j++;
    out.push(lerpP(dense[j], dense[j + 1], (s - L[j]) / (L[j + 1] - L[j] || 1)));
  }
  return out;
}

// Point and heading at fraction s along a polyline.
export function at(pts: Pt[], s: number): Pose {
  const f = clamp(s) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
  const a = pts[i], b = pts[i + 1];
  return [lerp(a[0], b[0], r), lerp(a[1], b[1], r), Math.atan2(b[1] - a[1], b[0] - a[0])];
}

function rng(seed: number) {
  let s = (Math.floor(seed) * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function jitter(p: Pt, r: () => number, amp: number): Pt {
  return [p[0] + (r() - 0.5) * 2 * amp, p[1] + (r() - 0.5) * 2 * amp];
}

// ---------- primitives ----------

// A pen stroke through pts. With amp > 0 the interior wobbles and the stroke is
// traced twice, like a pen going over a line again; the endpoints stay put.
export function stroke(c: CanvasRenderingContext2D, pts: Pt[], o: StrokeOpts) {
  if (pts.length < 2) return;
  const { color, w = 1.3, amp = 0, seed = 1, alpha = 1, dash, frac = 1 } = o;
  const m = Math.min(pts.length, Math.max(2, Math.round(pts.length * frac)));
  c.save();
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = "round";
  c.lineJoin = "round";
  if (dash) c.setLineDash(dash);
  const passes = amp > 0 ? 2 : 1;
  for (let p = 0; p < passes; p++) {
    const r = rng(seed * 97 + p * 13 + 1);
    const q = pts.slice(0, m).map((pt, i) => (amp && i > 0 && i < pts.length - 1 ? jitter(pt, r, amp) : pt));
    c.globalAlpha = alpha * (p ? 0.45 : 1);
    c.beginPath();
    c.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length - 1; i++) {
      c.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
    }
    c.lineTo(q[q.length - 1][0], q[q.length - 1][1]);
    c.stroke();
  }
  c.restore();
}

function segment(a: Pt, b: Pt): Pt[] {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 16) + 1);
  return Array.from({ length: n }, (_, i) => lerpP(a, b, i / (n - 1)));
}

export function line(c: CanvasRenderingContext2D, a: Pt, b: Pt, o: StrokeOpts) {
  stroke(c, segment(a, b), o);
}

// Polyline through corner points, each side drawn as its own pinned stroke.
export function poly(c: CanvasRenderingContext2D, corners: Pt[], o: StrokeOpts & { closed?: boolean }) {
  const n = o.closed ? corners.length : corners.length - 1;
  for (let i = 0; i < n; i++) line(c, corners[i], corners[(i + 1) % corners.length], { ...o, seed: (o.seed ?? 1) + i * 7 });
}

// Ellipse (or an arc of one, via a0/span). A full ellipse starts and ends on the
// same point, so it closes without a tail.
export function ellipse(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, o: ShapeOpts & { a0?: number; span?: number }) {
  const rot = o.rot ?? 0, a0 = o.a0 ?? -0.5, span = o.span ?? Math.PI * 2;
  const n = Math.max(14, Math.round((rx + ry) / 2.5)), cs = Math.cos(rot), sn = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (span * i) / n, x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * cs - y * sn, cy + x * sn + y * cs]);
  }
  stroke(c, pts, o);
}

// Box whose corners are jittered once and shared by both sides that meet there.
export function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: ShapeOpts) {
  const rot = o.rot ?? 0, cx = x + w / 2, cy = y + h / 2, cs = Math.cos(rot), sn = Math.sin(rot);
  const r = rng((o.seed ?? 1) * 31 + 5), amp = (o.amp ?? 0) * 0.6;
  const k: Pt[] = ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as Pt[])
    .map(([a, b]) => jitter([cx + a * cs - b * sn, cy + a * sn + b * cs], r, amp));
  if (o.fill) {
    c.save();
    c.globalAlpha = o.fillAlpha ?? 0.15;
    c.fillStyle = o.fill;
    c.beginPath();
    k.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.fill();
    c.restore();
  }
  poly(c, k, { ...o, closed: true });
}

// Diagonal hatching clipped to a box (shelves, walls).
export function hatch(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: StrokeOpts & { gap?: number }) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const g = o.gap ?? 7;
  for (let k = -h; k < w; k += g) line(c, [x + k, y + h], [x + k + h, y], { ...o, w: 0.8, seed: (o.seed ?? 1) + k });
  c.restore();
}

export function dot(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

export function label(c: CanvasRenderingContext2D, s: string, x: number, y: number, o: { font: string; color: string; align?: CanvasTextAlign; alpha?: number }) {
  c.save();
  c.font = o.font;
  c.fillStyle = o.color;
  c.globalAlpha = o.alpha ?? 1;
  c.textAlign = o.align ?? "left";
  c.fillText(s, x, y);
  c.restore();
}
