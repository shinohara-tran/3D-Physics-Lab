import { HandCamera } from './input/hands.js';
import { GestureInterpreter } from './input/interpreter.js';
import { startInputs } from './input/inputs.js';
import { ParamSet } from './ui/params.js';
import { RevealBoard } from './ui/reveal.js';
import { layoutFor } from './ui/layout.js';
import { THEMES, FONT } from './draw/theme.js';
import { drawChips } from './draw/primitives.js';
import { SCENES } from './scenes/index.js';

const NOTICE = 'Không mở được camera — vẫn dùng được bàn phím và chuột.';
const SLOW = 0.25, LABEL_S = 1;

/** Starts the webcam hand tracker; on any failure shows the Vietnamese notice and returns null. */
export async function startCamera(video = document.getElementById('cam'), notice = document.getElementById('notice')) {
  const cam = new HandCamera(video);
  try {
    await cam.start();
    return cam;
  } catch (e) {
    console.warn('Camera unavailable:', e);
    cam.stop();
    notice.textContent = NOTICE;
    notice.hidden = false;
    return null;
  }
}

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

function main() {
  const canvas = document.getElementById('stage'), ctx = canvas.getContext('2d'), video = document.getElementById('cam');
  const inputs = startInputs({ cameraOk: false });
  const gi = new GestureInterpreter();
  let cam = null, camShown = true;
  startCamera(video).then((c) => { cam = c; inputs.cameraOk = inputs.gesturesEnabled = !!c; });

  const st = { theme: 'light', paused: false, slow: false, layers: 0 };
  let scene, sceneIdx = 0, params, reveal, sim, L, hits = [], grabbed = false, adj = null, mouseAdj = null;

  const results = () => scene.results({ ...params.values(), ...sim.state() });
  function load(i) {
    sceneIdx = (i + SCENES.length) % SCENES.length; scene = SCENES[sceneIdx];
    params = new ParamSet(scene.params); sim = scene.create(params.values()); sim.L = L;   // right geometry for a grab before the first draw
    reveal = new RevealBoard(results().map((r) => r.key));
    st.layers = 0; grabbed = false; adj = mouseAdj = null;
  }
  const paramAt = (px, py) => hits.find((h) => h.kind === 'param' && inside(h.rect, px, py))?.key ?? null;
  const resultAt = (px, py) => hits.find((h) => h.kind === 'result' && inside(h.rect, px, py))?.key ?? null;
  const hit = { massAt: (x, y) => sim.hits(x, y), paramAt: (x, y) => paramAt(x * L.W, y * L.H) };
  const setParam = (key, v) => { params.set(key, v); sim.setParams(params.values()); };

  function apply(a) {
    switch (a.type) {
      case 'togglePause': st.paused = !st.paused; break;
      case 'slowMo': st.slow = !st.slow; break;
      case 'nextLayer': st.layers = Math.min(scene.layers.length, st.layers + 1); break;
      case 'prevLayer': st.layers = Math.max(0, st.layers - 1); break;
      case 'revealNext': reveal.revealNext(); break;
      case 'revealAll': reveal.revealAll(); break;
      case 'hideAll': reveal.hideAll(); break;
      case 'nextScene': load(sceneIdx + 1); break;
      case 'prevScene': load(sceneIdx - 1); break;
      case 'gotoScene': if (a.index < SCENES.length) load(a.index); break;
      case 'toggleTheme': st.theme = st.theme === 'light' ? 'dark' : 'light'; break;
      case 'toggleCamera': camShown = !camShown; break;
      case 'grab': grabbed = sim.grab(a.x, a.y); break;
      case 'drag': if (grabbed) sim.drag(a.x, a.y); break;
      case 'release': if (grabbed) sim.release(); grabbed = false; break;
      case 'selectParam': params.select(a.key); break;
      case 'adjust': {
        const s = params.specs.get(a.key);
        if (!s) break;
        // delta is cumulative since the pinch started: apply base + delta·(max − min)
        if (a.delta === 0 || adj?.key !== a.key) adj = { key: a.key, base: params.get(a.key) };
        params.select(a.key);
        setParam(a.key, adj.base + a.delta * (s.max - s.min));
        break;
      }
    }
  }

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;      // keep browser shortcuts (Ctrl+R …)
    const a = inputs.dispatchKey(e.key);
    if (!a) return;
    e.preventDefault();
    if (a.type === 'toggleGestures' && !inputs.gesturesEnabled && grabbed) apply({ type: 'release' });
    apply(a);
  });

  // Mouse parity with gestures: drag the mass, drag a param chip vertically, click a result chip, wheel a param chip.
  const norm = (e) => ({ x: e.offsetX / L.W, y: e.offsetY / L.H });
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const n = norm(e), rk = resultAt(e.offsetX, e.offsetY), pk = paramAt(e.offsetX, e.offsetY);
    if (rk) reveal.toggle(rk);
    else if (pk) { mouseAdj = { key: pk, y0: n.y }; apply({ type: 'adjust', key: pk, delta: 0 }); }
    else apply({ type: 'grab', ...n });
  });
  canvas.addEventListener('pointermove', (e) => {
    const n = norm(e);
    if (mouseAdj) apply({ type: 'adjust', key: mouseAdj.key, delta: -(n.y - mouseAdj.y0) });
    else if (grabbed) apply({ type: 'drag', ...n });
  });
  const up = (e) => { mouseAdj = null; if (grabbed) apply({ type: 'release', ...norm(e) }); };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    const key = paramAt(e.offsetX, e.offsetY);
    if (!key) return;
    e.preventDefault();
    params.select(key);
    params.stepBy(key, -e.deltaY); sim.setParams(params.values());
  }, { passive: false });

  function resize() {
    L = layoutFor(innerWidth, innerHeight, devicePixelRatio || 1);
    canvas.width = Math.round(L.W * L.dpr); canvas.height = Math.round(L.H * L.dpr);
  }
  addEventListener('resize', resize);

  function draw(t) {
    const th = THEMES[st.theme], f = L.fontPx, res = results();
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, L.W, L.H);
    sim.draw(ctx, { layout: L, theme: th, layerCount: st.layers, paused: st.paused, time: t, reveal, results: res });
    hits = drawChips(ctx, L.chips, params, reveal, res, th, f);

    const status = [scene.title, scene.lesson];
    if (st.paused) status.push('⏸ Tạm dừng');
    if (st.slow) status.push('Chậm ×0,25');
    if (st.layers) status.push(scene.layers.slice(0, st.layers).join(' + '));
    ctx.font = `${f}px ${FONT}`; ctx.fillStyle = th.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(status.join(' · '), L.stage.x, L.stage.y, L.stage.w);

    const c = L.cam;
    if (cam && camShown && video.readyState >= 2) {
      ctx.save(); ctx.translate(c.x + c.w, c.y); ctx.scale(-1, 1);   // mirrored selfie view
      ctx.drawImage(video, 0, 0, c.w, c.h); ctx.restore();
      ctx.strokeStyle = inputs.gesturesEnabled ? th.accent : th.muted; ctx.lineWidth = 3; ctx.strokeRect(c.x, c.y, c.w, c.h);
    }
    if (inputs.gesturesEnabled) {
      if (t - gi.lastLabelT < LABEL_S) {
        ctx.font = `${Math.round(f * 1.2)}px ${FONT}`; ctx.fillStyle = th.fg; ctx.textAlign = 'right';
        ctx.fillText(gi.lastLabel, c.x + c.w, c.y + c.h + f * 0.3);
      }
      if (gi.cursor) {
        ctx.beginPath(); ctx.arc(gi.cursor.x * L.W, gi.cursor.y * L.H, f * 0.35, 0, 2 * Math.PI);
        ctx.fillStyle = th.accent; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
      }
    }
  }

  let last = null;
  function frame(ts) {
    const t = ts / 1000, dt = last === null ? 0 : t - last;
    last = t;
    if (cam && inputs.gesturesEnabled) {
      const hands = cam.poll();
      if (hands) gi.update(hands[0], t, hit).forEach(apply);
    }
    sim.step(st.paused ? 0 : dt * (st.slow ? SLOW : 1));
    draw(t);
    requestAnimationFrame(frame);
  }

  resize(); load(0);
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') main();
