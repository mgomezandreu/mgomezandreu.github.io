import { ease, label, lerp, line, ph, rect, hatch, stroke, type Pt, type Scene, type ShapeOpts } from "../core";

// The classifier's belief that the test object has each of the five hardness
// levels (soft to hard): mean over dropout passes (P) and its spread (S). Row 0
// is after the initial training on every reference, one row per sampling round.
const P = [
  [0.10, 0.17, 0.27, 0.36, 0.10],
  [0.07, 0.12, 0.22, 0.50, 0.09],
  [0.05, 0.10, 0.18, 0.60, 0.07],
  [0.04, 0.06, 0.15, 0.69, 0.06],
  [0.03, 0.05, 0.10, 0.77, 0.05],
  [0.02, 0.04, 0.07, 0.83, 0.04],
];
const S = [
  [0.05, 0.10, 0.16, 0.14, 0.06],
  [0.05, 0.08, 0.08, 0.13, 0.05],
  [0.04, 0.09, 0.06, 0.07, 0.05],
  [0.04, 0.04, 0.07, 0.06, 0.03],
  [0.03, 0.03, 0.04, 0.05, 0.03],
  [0.02, 0.02, 0.03, 0.03, 0.02],
];
// Each round touches the reference the model is least sure about.
const PICKS = S.slice(0, -1).map(s => s.indexOf(Math.max(...s)));
const TRUE = 3, ROUNDS = PICKS.length, START = 1.6, ROUND = 1.8, HOLD = 1.6;
// Softer silicone dents deeper; denser hatching marks a harder reference.
const DENT = [5.5, 4.3, 3.2, 2.2, 1.3];
const GAP = [9, 7.5, 6, 4.8, 3.8];

// Active sampling for hardness: the sensor presses the test object once, then
// each round presses the reference object whose class the classifier is least
// sure about, retrains, and the belief over the test object's hardness sharpens.
export function touch(): Scene {
  return {
    still: START + 2 * ROUND + 1.2,
    draw(c, W, H, t, th) {
      const u = t % (START + ROUNDS * ROUND + HOLD), small = W < 220;
      const o = (x: Partial<ShapeOpts> = {}): ShapeOpts => ({ color: th.ink, w: th.w, amp: th.amp, ...x });
      const y0 = H - (small ? 10 : 18), padH = small ? 14 : 16, top = y0 - padH;
      const sw = small ? 14 : 20, sh = small ? 8 : 11, hover = top - 14;
      const yb = hover - sh - 14, bmax = yb - 16;
      const slot = (W * 0.68) / 5, pw = slot - (small ? 6 : 10);
      const refX = [0, 1, 2, 3, 4].map(i => W * 0.3 + slot * (i + 0.5)), testX = W * 0.14;
      const mix = (a: number[], b: number[], s: number) => a.map((x, i) => lerp(x, b[i], s));

      // where the sensor is, what it presses, and what the classifier believes
      let px: number, target: number, descend: number, press: number, p: number[], s: number[], pick = -1, hl = 0;
      if (u < START) {
        const back = ease(ph(u, 0, 0.5));
        px = lerp(refX[PICKS[ROUNDS - 1]], testX, ease(ph(u, 0, 0.4)));
        target = -1;
        descend = ease(ph(u, 0.4, 0.6)) - ease(ph(u, 1.2, 1.45));
        press = ph(u, 0.6, 0.75) - ph(u, 1.05, 1.2);
        p = mix(P[ROUNDS], P[0], back);
        s = mix(S[ROUNDS], S[0], back);
      } else if (u < START + ROUNDS * ROUND) {
        const k = Math.floor((u - START) / ROUND), v = u - START - k * ROUND, learnt = ease(ph(v, 1.4, 1.8));
        pick = target = PICKS[k];
        px = lerp(k ? refX[PICKS[k - 1]] : testX, refX[pick], ease(ph(v, 0.3, 0.8)));
        descend = ease(ph(v, 0.8, 1.0)) - ease(ph(v, 1.4, 1.6));
        press = ph(v, 1.0, 1.1) - ph(v, 1.3, 1.4);
        p = mix(P[k], P[k + 1], learnt);
        s = mix(S[k], S[k + 1], learnt);
        hl = ph(v, 0, 0.3) * (1 - ph(v, 1.45, 1.8));
      } else {
        px = refX[PICKS[ROUNDS - 1]];
        target = PICKS[ROUNDS - 1];
        descend = press = 0;
        p = P[ROUNDS];
        s = S[ROUNDS];
      }
      const depth = (small ? 1 : 1.3) * DENT[target < 0 ? TRUE : target] * press;

      // test object and the five references, standing on the table
      line(c, [W * 0.02, y0], [W * 0.98, y0], o({ color: th.faint, seed: 2 }));
      const pad = (cx: number, i: number, dent: number) => {
        const x = cx - pw / 2, surface: Pt[] = [];
        for (let j = 0; j <= 10; j++) surface.push([x + (pw * j) / 10, top + dent * Math.pow(Math.sin((Math.PI * j) / 10), 3)]);
        line(c, [x, y0], [x, top], o({ seed: 20 + i * 5 }));
        stroke(c, surface, o({ seed: 21 + i * 5, amp: th.amp * 0.25 }));
        line(c, [x + pw, top], [x + pw, y0], o({ seed: 22 + i * 5 }));
      };
      pad(testX, 9, target < 0 ? depth : 0);
      refX.forEach((cx, i) => {
        hatch(c, cx - pw / 2, top + 6, pw, padH - 6, { color: th.faint, amp: th.amp * 0.5, seed: 40 + i * 9, gap: GAP[i] });
        pad(cx, i, target === i ? depth : 0);
      });

      // the sensor, on a short stem
      const bottom = lerp(hover, top, descend) + depth;
      line(c, [px, bottom - sh - 8], [px, bottom - sh], o({ seed: 9, color: th.faint }));
      rect(c, px - sw / 2, bottom - sh, sw, sh, o({ seed: 11, fill: th.accent, fillAlpha: 0.2 }));

      // belief over the test object's hardness, one bar above each reference;
      // the whisker is the spread over dropout passes, red where it is widest
      label(c, "?", testX, yb - 4, { font: th.hand(18), color: th.ink, align: "center" });
      line(c, [refX[0] - slot / 2 + 2, yb], [refX[4] + slot / 2 - 2, yb], o({ seed: 80, color: th.faint }));
      const Y = (q: number) => yb - (Math.max(0, q) * bmax) / 0.9, bw = slot * 0.5, cap = small ? 3 : 4;
      refX.forEach((cx, i) => {
        rect(c, cx - bw / 2, Y(p[i]), bw, Math.max(2, yb - Y(p[i])), o({ seed: 70 + i, fill: th.ink, fillAlpha: 0.1 }));
        const lo = Y(p[i] - s[i]), hi = Y(p[i] + s[i]), red = i === pick ? hl : 0;
        const whisker = (color: string, alpha: number, w: number) => {
          if (alpha <= 0) return;
          line(c, [cx, lo], [cx, hi], { color, alpha, w, seed: 90 + i });
          line(c, [cx - cap, hi], [cx + cap, hi], { color, alpha, w, seed: 95 + i });
        };
        whisker(th.ink, 1 - red, 1.2);
        whisker(th.accent, red, 1.8);
        if (red && !small) label(c, "least sure", cx, hi - 5, { font: th.hand(13), color: th.accent, align: "center", alpha: red });
      });

      if (!small) {
        const note = (s: string, x: number) => label(c, s, x, y0 + 14, { font: th.hand(13), color: th.faint, align: "center" });
        note("test", testX);
        note("soft", refX[0]);
        note("hard", refX[4]);
      }
    },
  };
}
