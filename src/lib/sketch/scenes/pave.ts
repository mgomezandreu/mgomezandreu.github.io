import { at, ease, ellipse, hatch, label, lerpP, line, ph, rect, smooth, stroke, type Pt, type Scene, type ShapeOpts } from "../core";

// PAVE, top-down: the follower shares its value function (where it would like
// the table to end up), the leader pushes the table there while cleaning under
// it, and the corridor is free when the follower sets off.
export function pave(): Scene {
  return {
    still: 9.4,
    draw(c, W, H, t, th) {
      const u = t % 10.5, small = W < 220;
      const X = (x: number) => x * W, Y = (y: number) => y * H;
      const o = (x: Partial<ShapeOpts> = {}): ShapeOpts => ({ color: th.ink, w: th.w, amp: th.amp, ...x });

      rect(c, X(0.03), Y(0.06), X(0.94), Y(0.88), o({ seed: 1, color: th.faint }));
      [[0.03, 0.38, 0.25, 0.26], [0.72, 0.38, 0.25, 0.26]].forEach(([x, y, w, h], i) => {
        hatch(c, X(x), Y(y), X(w), Y(h), { ...o({ seed: 9 + i * 40, color: th.faint }), gap: small ? 5 : 7 });
        rect(c, X(x), Y(y), X(w), Y(h), o({ seed: 5 + i }));
      });

      // the follower's value, drawn on as it is shared
      const shared = ph(u, 0.2, 1.4);
      if (shared > 0) [1, 0.64, 0.3].forEach((q, j) =>
        ellipse(c, X(0.77), Y(0.2), X(0.13) * q, Y(0.11) * q, { color: th.accent, w: 1, amp: th.amp * 0.6, seed: 60 + j, dash: [3, 3], frac: shared, alpha: 0.85 }));

      const tablePath = smooth([[X(0.5), Y(0.5)], [X(0.53), Y(0.3)], [X(0.77), Y(0.2)]], 50);
      const [tx, ty] = at(tablePath, ease(ph(u, 2.1, 4.6)));
      const cleaned = ph(u, 5.2, 5.8);
      if (cleaned < 1) for (let j = 0; j < 3; j++) {
        stroke(c, [[X(0.47), Y(0.47) + j * 4], [X(0.5), Y(0.45) + j * 4], [X(0.53), Y(0.49) + j * 4]], { color: th.ink, w: 1, amp: th.amp, seed: 70 + j, alpha: 0.6 * (1 - cleaned) });
      }
      rect(c, tx - X(0.18), ty - Y(0.1), X(0.36), Y(0.2), o({ seed: 20, fill: th.bg, fillAlpha: 1 }));
      if (!small) label(c, "table", tx, ty + 5, { font: th.hand(13), color: th.faint, align: "center" });

      // leader: approach, push from behind, clean the spot, park
      const behind = (x: number, y: number, a: number): Pt => {
        const dx = Math.cos(a), dy = Math.sin(a), off = Math.abs(dx) * X(0.18) + Math.abs(dy) * Y(0.1) + 9;
        return [x - dx * off, y - dy * off];
      };
      const leader = (v: number): Pt => {
        const start: Pt = [X(0.5), Y(0.86)], dirt: Pt = [X(0.5), Y(0.5)], park: Pt = [X(0.16), Y(0.86)];
        if (v < 2.1) return lerpP(start, behind(...at(tablePath, 0)), ease(ph(v, 1.4, 2.1)));
        if (v < 4.6) return behind(...at(tablePath, ease(ph(v, 2.1, 4.6))));
        if (v < 5.2) return lerpP(behind(...at(tablePath, 1)), dirt, ease(ph(v, 4.6, 5.2)));
        if (v < 5.8) return [dirt[0] + 6 * Math.sin(v * 16), dirt[1] + 3 * Math.cos(v * 16)];
        return lerpP(dirt, park, ease(ph(v, 5.8, 6.4)));
      };
      const followerPath = smooth(([[0.12, 0.2], [0.3, 0.24], [0.46, 0.36], [0.5, 0.55], [0.56, 0.74], [0.86, 0.8]] as Pt[]).map(([x, y]) => [X(x), Y(y)]), 70);
      const follower = (v: number): Pt => {
        const [x, y] = at(followerPath, ease(ph(v, 6.4, 9.2)));
        return [x, y];
      };
      const travelled = ph(u, 6.4, 9.2);
      if (travelled > 0) stroke(c, followerPath, { color: th.ink, w: 1, dash: [4, 4], frac: travelled, alpha: 0.6 });

      const robot = (p: Pt, q: Pt, color: string, seed: number) => {
        const moving = Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05;
        const hd = moving ? Math.atan2(p[1] - q[1], p[0] - q[0]) : -Math.PI / 2, r = small ? 4.5 : 7;
        ellipse(c, p[0], p[1], r, r, { color, w: th.w + 0.2, amp: th.amp * 0.4, seed });
        line(c, p, [p[0] + Math.cos(hd) * r * 1.6, p[1] + Math.sin(hd) * r * 1.6], { color, w: th.w, seed: seed + 1 });
      };
      robot(leader(u), leader(u - 0.04), th.accent, 80);
      robot(follower(u), follower(u - 0.04), th.ink, 90);

      if (!small) {
        const note = (s: string, x: number, y: number, color: string) => label(c, s, X(x), Y(y), { font: th.hand(13), color });
        if (u < 2.1) {
          note("follower wants the table here", 0.5, 0.35, th.accent);
          note("leader", 0.55, 0.88, th.faint);
          note("follower", 0.17, 0.16, th.faint);
        }
        if (u > 3.6 && u < 5.8) note("dirt", 0.56, 0.5, th.faint);
        if (u > 9.2) note("made it", 0.7, 0.91, th.accent);
      }
    },
  };
}
