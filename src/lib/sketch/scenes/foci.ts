import { clamp, dot, ellipse, label, lerp, lerpP, line, stroke, type Draggable, type Pt, type Theme } from "../core";

type Blob = { x: number; y: number; rx: number; ry: number; r: number; wobble: number; phase: number };
type Grab = { end: "S" | "G" } | { blob: Blob; dx: number; dy: number };

// Scene Gaussians as [x, y, outer radius x, outer radius y, rotation, drift], in
// fractions of the canvas. The outer contour sits at 1.9 standard deviations.
// The first two form a wall with a gap narrower than the robot is long.
const BLOBS: [number, number, number, number, number, number][] = [
  [0.49, 0.22, 0.05, 0.2, 0.2, 0.25], [0.52, 0.78, 0.05, 0.2, 0.2, 0.25],
  [0.25, 0.28, 0.06, 0.12, -0.3, 1], [0.74, 0.72, 0.06, 0.12, 0.4, 1],
  [0.15, 0.82, 0.04, 0.07, 0, 1], [0.85, 0.2, 0.04, 0.07, 0, 1], [0.33, 0.75, 0.035, 0.06, 0, 1],
];
// The robot is a row of Gaussians along its long axis, in units of their spacing.
const BODY = [-1, 0, 1];
// Start and goal poses face sideways, so the robot has to turn to fit the gap.
const END_HEADING = Math.PI / 2 - 0.15;
const POINTS = 44;
const ITERS_PER_FRAME = 5;
const TURN_RATE = 0.15;

// FOCI-style trajectory optimization over poses (x, y, heading). Every robot
// Gaussian at every waypoint descends the overlap integral with every scene
// Gaussian; for two Gaussians that is again a Gaussian, with covariance
// (Sigma + sigma_r^2 I). Its gradient moves the waypoint and turns it, while
// spring terms keep positions and headings smooth. Blobs drift until someone
// grabs one; S, G and every blob can be dragged.
export function foci(): Draggable {
  let S: Pt = [0.05, 0.5], G: Pt = [0.95, 0.5], drift = true, touched = false, now = 0;
  let pts: Pt[] = [], heading: number[] = [];
  const blobs: Blob[] = BLOBS.map(([x, y, rx, ry, r, wobble], i) => ({ x, y, rx, ry, r, wobble, phase: i * 1.7 }));
  const centre = (b: Blob, t: number): Pt => drift
    ? [b.x + 0.02 * b.wobble * Math.sin(t * 0.45 + b.phase), b.y + 0.05 * b.wobble * Math.cos(t * 0.37 + b.phase * 1.3)]
    : [b.x, b.y];

  const drawRobot = (c: CanvasRenderingContext2D, x: number, y: number, a: number, sr: number, gap: number, th: Theme, faint: boolean) => {
    const centres: Pt[] = BODY.map(k => [x + Math.cos(a) * k * gap, y + Math.sin(a) * k * gap]);
    const o = faint
      ? { color: th.ink, w: 1, alpha: 0.28 }
      : { color: th.ink, w: th.w, amp: th.amp * 0.4 };
    line(c, centres[0], centres[centres.length - 1], { ...o, seed: 44 });
    centres.forEach(([cx, cy], j) => {
      ellipse(c, cx, cy, sr * 1.9, sr * 1.9, { ...o, seed: 40 + j });
      if (!faint) ellipse(c, cx, cy, sr * 0.9, sr * 0.9, { ...o, seed: 47 + j });
    });
  };

  const s: Draggable & { drag: Grab | null } = {
    still: 0,
    drag: null,
    reset() {
      pts = Array.from({ length: POINTS }, (_, i) => lerpP(S, G, i / (POINTS - 1)));
      heading = pts.map(() => END_HEADING);
    },
    pick(x, y, W, H) {
      let hit: Grab | null = null;
      if (Math.hypot(x - S[0] * W, y - S[1] * H) < 16) hit = { end: "S" };
      else if (Math.hypot(x - G[0] * W, y - G[1] * H) < 16) hit = { end: "G" };
      else {
        let best = 1.3;
        for (const b of blobs) {
          const [cx, cy] = centre(b, now), d = Math.hypot((x - cx * W) / (b.rx * W), (y - cy * H) / (b.ry * H));
          if (d < best) { best = d; hit = { blob: b, dx: 0, dy: 0 }; }
        }
      }
      if (!hit) return false;
      if (drift) {
        for (const b of blobs) [b.x, b.y] = centre(b, now);
        drift = false;
      }
      if ("blob" in hit) { hit.dx = hit.blob.x - x / W; hit.dy = hit.blob.y - y / H; }
      touched = true;
      s.drag = hit;
      return true;
    },
    move(x, y, W, H) {
      const d = s.drag;
      if (!d) return;
      const p: Pt = [clamp(x / W, 0.02, 0.98), clamp(y / H, 0.04, 0.96)];
      if ("end" in d) {
        if (d.end === "S") S = p; else G = p;
      } else {
        d.blob.x = clamp(p[0] + d.dx);
        d.blob.y = clamp(p[1] + d.dy);
      }
    },
    draw(c, W, H, t, th) {
      now = t;
      const small = W < 220, sr = clamp(H * 0.032, 3.5, 7), gap = H * 0.11;
      const B = blobs.map(b => {
        const [x, y] = centre(b, t), sx = (b.rx * W) / 1.9, sy = (b.ry * H) / 1.9, cs = Math.cos(b.r), sn = Math.sin(b.r);
        const a = 1 / (sx * sx + sr * sr), d = 1 / (sy * sy + sr * sr); // (Sigma + sigma_r^2 I)^-1 in the blob frame
        return {
          x: x * W, y: y * H, rx: b.rx * W, ry: b.ry * H, r: b.r,
          A11: a * cs * cs + d * sn * sn, A12: (a - d) * cs * sn, A22: a * sn * sn + d * cs * cs,
          gain: 0.2 / (a + d) / BODY.length,
        };
      });
      const overlap = (px: number, py: number, b: (typeof B)[number]) => {
        const dx = px - b.x, dy = py - b.y, ax = b.A11 * dx + b.A12 * dy, ay = b.A12 * dx + b.A22 * dy;
        return { e: Math.exp(-0.5 * (dx * ax + dy * ay)), ax, ay };
      };

      const P: Pt[] = pts.map(([x, y]) => [x * W, y * H]), n = P.length;
      P[0] = [S[0] * W, S[1] * H];
      P[n - 1] = [G[0] * W, G[1] * H];
      heading[0] = heading[n - 1] = END_HEADING;
      for (let it = 0; it < ITERS_PER_FRAME; it++) {
        const Q = P.map(p => [p[0], p[1]] as Pt), A = heading.slice();
        for (let i = 1; i < n - 1; i++) {
          let gx = 0.3 * (P[i - 1][0] + P[i + 1][0] - 2 * P[i][0]), gy = 0.3 * (P[i - 1][1] + P[i + 1][1] - 2 * P[i][1]);
          let ga = 0.3 * (heading[i - 1] + heading[i + 1] - 2 * heading[i]);
          const cs = Math.cos(heading[i]), sn = Math.sin(heading[i]);
          for (const k of BODY) {
            // This robot Gaussian's position, and how it moves as the robot turns.
            const ox = k * gap, px = P[i][0] + cs * ox, py = P[i][1] + sn * ox, tx = -sn * ox, ty = cs * ox;
            for (const b of B) {
              const { e, ax, ay } = overlap(px, py, b);
              gx += b.gain * e * ax;
              gy += b.gain * e * ay;
              ga += TURN_RATE * e * (ax * tx + ay * ty);
            }
          }
          Q[i] = [clamp(P[i][0] + gx, 2, W - 2), clamp(P[i][1] + gy, 2, H - 2)];
          A[i] = heading[i] + clamp(ga, -0.08, 0.08);
        }
        for (let i = 1; i < n - 1; i++) P[i] = Q[i];
        heading = A;
      }
      pts = P.map(([x, y]) => [x / W, y / H]);

      B.forEach((b, i) => [1, 0.63, 0.3].forEach((q, j) =>
        ellipse(c, b.x, b.y, b.rx * q, b.ry * q, { rot: b.r, color: th.ink, alpha: [0.45, 0.65, 0.9][j], w: th.w * 0.9, amp: th.amp, seed: i * 5 + j + 1 })));
      for (let i = 2; i < n - 2; i += 4) drawRobot(c, P[i][0], P[i][1], heading[i], sr, gap, th, true);
      stroke(c, P, { color: th.accent, w: th.w + 0.4 });

      let total = 0;
      P.forEach((p, i) => {
        let worst = 0;
        for (const k of BODY) {
          const px = p[0] + Math.cos(heading[i]) * k * gap, py = p[1] + Math.sin(heading[i]) * k * gap;
          let e = 0;
          for (const b of B) e += overlap(px, py, b).e;
          total += e;
          worst = Math.max(worst, e);
        }
        if (worst > 0.25) dot(c, p[0], p[1], 2.4, th.accent);
      });

      // The robot walks the optimized trajectory, pose by pose.
      const f = ((t * 0.16) % 1) * (n - 1), i = Math.min(n - 2, Math.floor(f)), r = f - i;
      drawRobot(c, lerp(P[i][0], P[i + 1][0], r), lerp(P[i][1], P[i + 1][1], r), lerp(heading[i], heading[i + 1], r), sr, gap, th, false);

      ([[S, "S"], [G, "G"]] as [Pt, string][]).forEach(([p, l], j) => {
        dot(c, p[0] * W, p[1] * H, 2.6, th.ink);
        if (!small) label(c, l, p[0] * W + (j ? -15 : 7), p[1] * H - 10, { font: th.hand(15), color: th.ink });
      });
      if (!small) {
        label(c, `overlap ${(total / (n * BODY.length)).toFixed(3)}`, W - 8, 16, { font: th.hand(13), color: th.faint, align: "right" });
        if (!touched) label(c, "drag a blob, S or G", 8, H - 8, { font: th.hand(13), color: th.accent });
      }
    },
  };
  s.reset();
  return s;
}
