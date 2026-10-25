import { ease, ellipse, label, lerp, line, ph, rect, stroke, type Pt, type Scene, type ShapeOpts } from "../core";

// RoboWrangler: a quadruped spins a rope loop, throws it over a box, cinches it
// and pulls the box in.
export function lasso(): Scene {
  return {
    still: 4.2,
    draw(c, W, H, t, th) {
      const u = t % 7, small = W < 220, y0 = H - (small ? 12 : 18);
      const o = (x: Partial<ShapeOpts> = {}): ShapeOpts => ({ color: th.ink, w: th.w, amp: th.amp, ...x });
      line(c, [6, y0], [W - 6, y0], o({ color: th.faint, seed: 1 }));

      // quadruped: body, legs with knees, head, two-link arm
      const bw = Math.min(W * 0.22, 90), bh = small ? 10 : 16, bx = W * 0.07, by = y0 - (small ? 28 : 44);
      rect(c, bx, by, bw, bh, o({ seed: 3 }));
      [[0.1, 1], [0.28, -1], [0.72, 1], [0.9, -1]].forEach(([f, knee], i) => {
        const x = bx + bw * f;
        stroke(c, [[x, by + bh], [x + 5 * knee, by + bh + (y0 - by - bh) / 2], [x, y0]], o({ seed: 10 + i }));
      });
      rect(c, bx + bw, by - 6, small ? 9 : 14, small ? 8 : 11, o({ seed: 20 }));
      const tip: Pt = [bx + bw * 1.05, by - (small ? 20 : 34)];
      stroke(c, [[bx + bw * 0.7, by], [bx + bw * 0.85, by - (small ? 12 : 22)], tip], o({ seed: 22, w: th.w + 0.4 }));

      // box, pulled towards the robot once the loop is cinched
      const bs = small ? 16 : 26, box = W * 0.74 - ease(ph(u, 4.5, 5.9)) * W * 0.14;
      rect(c, box, y0 - bs, bs + 4, bs, o({ seed: 30, fill: th.ink, fillAlpha: 0.07 }));

      // loop: spin, throw over the box, drop and cinch
      const spin = t * 9, R0 = small ? 14 : 24;
      const sx = tip[0] + W * 0.12 + 6 * Math.cos(spin * 0.5), sy = tip[1] - 6 + 3 * Math.sin(spin * 0.5);
      const tx = box + (bs + 4) / 2, ty0 = y0 - bs - 10, ty1 = y0 - bs * 0.55;
      const a = ease(ph(u, 2.4, 3.5)), d = ease(ph(u, 3.5, 4.4));
      const lx = lerp(sx, tx, a), ly = lerp(lerp(sy, ty0, a) - Math.sin(Math.PI * a) * 18, ty1, d);
      const R = lerp(R0, (bs + 4) / 2 + 3, d);
      const ry = d > 0 ? lerp(6, 5, d) : lerp(4 + 9 * Math.abs(Math.sin(spin)), 6, a);
      const sag = u > 4.4 ? 0 : 14 * (1 - a * 0.3), rope: Pt[] = [];
      for (let j = 0; j <= 16; j++) {
        const q = j / 16;
        rope.push([lerp(tip[0], lx - R, q), lerp(tip[1], ly, q) + Math.sin(Math.PI * q) * sag]);
      }
      stroke(c, rope, o({ seed: 50, amp: th.amp * 0.5 }));
      ellipse(c, lx, ly, R, small ? ry * 0.7 : ry, o({ seed: 60, color: th.accent, w: th.w + 0.3, amp: th.amp * 0.5 }));

      if (!small) {
        if (u < 2.4) label(c, "rope as a gripper?", W * 0.46, 22, { font: th.hand(15), color: th.faint });
        else if (u > 4.4) label(c, "got it", W * 0.62, 22, { font: th.hand(15), color: th.accent });
      }
    },
  };
}
