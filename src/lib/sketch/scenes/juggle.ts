import { dot, label, lerp, stroke, type Pt, type Scene } from "../core";

export interface Juggler extends Scene {
  name: string;
  set(name: string, t: number): void;
}

const BEAT = 0.27;   // seconds per beat
const DWELL = 0.55;  // beats a ball spends in the hand before being thrown again

// Siteswap simulator. The ball thrown on beat i with height h lands h beats
// later, in the other hand when h is odd. It flies for (h - dwell) beats, then
// the catching hand carries it inward to the next throw.
export function juggle(): Juggler {
  let pat = [7, 4, 4], t0 = 0;
  const s: Juggler = {
    name: "744",
    still: 0,
    set(name, t) {
      s.name = name;
      pat = name.split("").map(Number);
      t0 = t;
    },
    draw(c, W, H, t, th) {
      const small = W < 220, tt = t - t0 + 30, n = pat.length, maxH = Math.max(...pat);
      const y0 = H - (small ? 18 : 26), tfm = (maxH - DWELL) * BEAT, g = (8 * (y0 - 14)) / (tfm * tfm);
      const span = Math.min(W * 0.8, 280);
      const hx = (hand: number, throwing: boolean) => W / 2 + (hand ? 1 : -1) * span * (throwing ? 0.09 : 0.34);
      const mod = (a: number, m: number) => ((a % m) + m) % m;
      const pos = (i: number, q: number) => {
        const h = pat[mod(i, n)];
        if (!h) return null;
        const st = i * BEAT;
        if (q < st || q >= st + h * BEAT) return null;
        const from = mod(i, 2), to = mod(i + h, 2), tf = (h - DWELL) * BEAT, tau = q - st;
        if (tau < tf) return { x: lerp(hx(from, true), hx(to, false), tau / tf), y: y0 - 0.5 * g * tau * (tf - tau), fly: true };
        const r = (tau - tf) / (DWELL * BEAT);
        return { x: lerp(hx(to, false), hx(to, true), r), y: y0 + 6 * Math.sin(Math.PI * r), fly: false };
      };
      for (const hand of [0, 1]) {
        const pts: Pt[] = [];
        for (let j = 0; j <= 10; j++) {
          const r = j / 10;
          pts.push([lerp(hx(hand, false), hx(hand, true), r), y0 + 6 * Math.sin(Math.PI * r) + 7]);
        }
        stroke(c, pts, { color: th.faint, w: th.w, amp: th.amp, seed: 3 + hand });
      }
      const k = Math.floor(tt / BEAT);
      for (let i = k - maxH - 1; i <= k; i++) {
        const p = pos(i, tt);
        if (!p) continue;
        if (p.fly) {
          const st = i * BEAT, trace: Pt[] = [];
          for (let j = 0; j <= 20; j++) {
            const q = pos(i, st + ((tt - st) * j) / 20);
            if (q && q.fly) trace.push([q.x, q.y]);
          }
          stroke(c, trace, { color: th.accent, w: 1.2, alpha: 0.75 });
        }
        dot(c, p.x, p.y, small ? 3 : 4.4, th.ink);
      }
      if (!small) label(c, s.name, 10, 22, { font: th.hand(17), color: th.faint });
    },
  };
  return s;
}
