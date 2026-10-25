import { NOTEBOOK, isDraggable, type Scene, type SceneName } from "./core";
import { parseSiteswap } from "./siteswap";
import { foci } from "./scenes/foci";
import { juggle, type Juggler } from "./scenes/juggle";
import { lasso } from "./scenes/lasso";
import { pave } from "./scenes/pave";
import { touch } from "./scenes/touch";

const SCENES: Record<SceneName, () => Scene> = { juggle, foci, lasso, touch, pave };

type Mounted = {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scene: Scene;
  W: number;
  H: number;
  visible: boolean;
  offset: number;  // so two copies of the same scene are not in lockstep
  t: number;
  pressed?: string;
};

const isJuggler = (s: Scene): s is Juggler => "set" in s;

// Bring every <canvas data-scene> on the page to life and wire up the controls
// that point at one via data-for. Sketches only animate while on screen; with
// prefers-reduced-motion they show a still frame (draggable ones still respond).
export function mountSketches() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mounted: Mounted[] = [];
  const byId = new Map<string, Mounted>();

  const render = (m: Mounted) => {
    if (!m.W) return;
    m.t = reduce ? m.scene.still : performance.now() / 1000 + m.offset;
    m.ctx.clearRect(0, 0, m.W, m.H);
    m.scene.draw(m.ctx, m.W, m.H, m.t, NOTEBOOK);
    if (isJuggler(m.scene) && m.scene.name !== m.pressed && m.cv.id) {
      m.pressed = m.scene.name;
      document.querySelectorAll<HTMLButtonElement>(`[data-siteswap][data-for="${m.cv.id}"]`)
        .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.siteswap === m.pressed)));
    }
  };

  const visibility = new IntersectionObserver(entries => {
    for (const e of entries) {
      const m = mounted.find(x => x.cv === e.target);
      if (m) m.visible = e.isIntersecting;
    }
  });

  document.querySelectorAll<HTMLCanvasElement>("canvas[data-scene]").forEach((cv, i) => {
    const make = SCENES[cv.dataset.scene as SceneName];
    const ctx = cv.getContext("2d");
    if (!make || !ctx) return;
    const m: Mounted = { cv, ctx, scene: make(), W: 0, H: 0, visible: false, offset: i * 1.37, t: 0 };
    mounted.push(m);
    if (cv.id) byId.set(cv.id, m);

    new ResizeObserver(() => {
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      m.W = r.width;
      m.H = r.height;
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(m);
    }).observe(cv);
    visibility.observe(cv);

    const scene = m.scene;
    if (isDraggable(scene)) {
      const local = (e: PointerEvent): [number, number] => {
        const r = cv.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      cv.addEventListener("pointerdown", e => {
        if (!scene.pick(...local(e), m.W, m.H)) return;
        cv.setPointerCapture(e.pointerId);
        cv.dataset.dragging = "";
        e.preventDefault();
      });
      cv.addEventListener("pointermove", e => {
        if (scene.drag) scene.move(...local(e), m.W, m.H);
      });
      const release = () => {
        scene.drag = null;
        delete cv.dataset.dragging;
      };
      cv.addEventListener("pointerup", release);
      cv.addEventListener("pointercancel", release);
    }
  });

  // Siteswap buttons and the "your own pattern" form.
  document.querySelectorAll<HTMLButtonElement>("button[data-siteswap][data-for]").forEach(b => b.addEventListener("click", () => {
    const m = byId.get(b.dataset.for ?? "");
    if (!m || !isJuggler(m.scene)) return;
    m.scene.set(b.dataset.siteswap ?? "3", m.t);
    render(m);
    const msg = document.querySelector(`[data-siteswap-msg][data-for="${b.dataset.for}"]`);
    if (msg) msg.textContent = "";
  }));
  document.querySelectorAll<HTMLFormElement>("form[data-siteswap-form][data-for]").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    const m = byId.get(f.dataset.for ?? ""), input = f.elements.namedItem("siteswap");
    const msg = document.querySelector(`[data-siteswap-msg][data-for="${f.dataset.for}"]`);
    if (!m || !isJuggler(m.scene) || !(input instanceof HTMLInputElement)) return;
    const parsed = parseSiteswap(input.value.trim());
    if ("error" in parsed) {
      if (msg) msg.textContent = parsed.error;
      return;
    }
    m.scene.set(parsed.pattern.join(""), m.t);
    render(m);
    if (msg) msg.textContent = `${parsed.balls} ball${parsed.balls === 1 ? "" : "s"}`;
  }));
  document.querySelectorAll<HTMLButtonElement>("button[data-reset][data-for]").forEach(b => b.addEventListener("click", () => {
    const m = byId.get(b.dataset.for ?? "");
    if (m && isDraggable(m.scene)) m.scene.reset();
  }));

  const loop = () => {
    for (const m of mounted) if (m.visible && (!reduce || isDraggable(m.scene))) render(m);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  // Canvas labels use the handwriting face; redraw once it has loaded.
  document.fonts?.ready.then(() => mounted.forEach(render));
}
