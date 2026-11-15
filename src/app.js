import { HandCamera } from './input/hands.js';
import { GestureInterpreter } from './input/interpreter.js';
import { startInputs, clickerAction, cameraLost, wheelSteps, reach } from './input/inputs.js';
import { ParamSet } from './ui/params.js';
import { RevealBoard } from './ui/reveal.js';
import { layoutFor } from './ui/layout.js';
import { drawHelp } from './ui/help.js';
import { THEMES, FONT } from './draw/theme.js';
import { drawChips, chipRows, drawFormula } from './draw/primitives.js';
import { SCENES } from './scenes/index.js';
import { createHome } from './ui/home.js';
import { locate } from './ui/catalog.js';

const NOTICE = 'Không mở được camera — vẫn dùng được bàn phím và chuột.';
const LOST = 'Mất camera — vẫn dùng được bàn phím và chuột.';
const SLOW = 0.25, LABEL_S = 1;

/** Shows the notice, then hides it after `ms` (or on click) so it never covers the stage. `later` is injectable for tests. */
export function showNotice(el, text, ms = 6000, later = setTimeout) {
  el.textContent = text; el.hidden = false;
  const hide = () => { el.hidden = true; };
  el.onclick = hide;
  later(hide, ms);
}

/** Starts the webcam hand tracker; on any failure shows the Vietnamese notice and returns null. */
export async function startCamera(video = document.getElementById('cam'), notice = document.getElementById('notice')) {
  const cam = new HandCamera(video);
  try {
    await cam.start();
    return cam;
  } catch (e) {
    console.warn('Camera unavailable:', e);
    cam.stop();
    showNotice(notice, NOTICE);
    return null;
  }
}

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

function main() {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost';
  if ('serviceWorker' in navigator && secure) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('sw', e));
  const canvas = document.getElementById('stage'), ctx = canvas.getContext('2d'), video = document.getElementById('cam');
  const inputs = startInputs({ cameraOk: false });
  let gi = new GestureInterpreter();
  let cam = null, camShown = true, camT = null, camVT = -1;   // camT: time of the last new camera frame
  startCamera(video).then((c) => {
    cam = c; camT = null;
    c?.stream?.getVideoTracks()[0]?.addEventListener('ended', () => { c.ended = true; });
    inputs.cameraReady(!!c);   // keeps gestures off if 'g' turned them off while loading
  });

  const st = { theme: 'light', paused: false, slow: false, layers: 0, help: false };
  let scene, sceneIdx = 0, params, reveal, sim, L, rows = 2, hits = [], grabbed = false, adj = null, mouseAdj = null, wheel = { key: null, acc: 0 };

  const results = () => scene.results({ ...params.values(), ...sim.state() });
  function load(i) {
    sceneIdx = (i + SCENES.length) % SCENES.length; scene = SCENES[sceneIdx];
    params = new ParamSet(scene.params); sim = scene.create(params.values()); sim.L = L;   // right geometry for a grab before the first draw
    reveal = new RevealBoard(results().map((r) => r.key));
    st.layers = 0; grabbed = false; adj = mouseAdj = null;
    renderBar();
  }

  // Lesson bar: where we are in the curriculum + one tab per simulation of the same chapter.
  const crumb = document.getElementById('crumb'), tabs = document.getElementById('tabs');
  function renderBar() {
    const at = locate(scene.id);
    const chapterScenes = at ? at.chapter.lessons.flatMap((l) => l.scenes) : [scene.id];
    crumb.innerHTML = at ? `Lớp ${at.grade} · HK${at.sem} · <b>Chương ${at.chapter.no}: ${at.chapter.title}</b>` : '';
    tabs.replaceChildren(...chapterScenes.map((id) => {
      const i = SCENES.findIndex((s) => s.id === id), b = document.createElement('button');
      b.type = 'button'; b.className = 'tab'; b.role = 'tab'; b.textContent = SCENES[i].title;
      b.setAttribute('aria-selected', String(i === sceneIdx));
      b.onclick = () => load(i);
      return b;
    }));
  }
  const setTheme = (t) => { st.theme = t; document.documentElement.dataset.theme = t; };
  const home = createHome(document.getElementById('home'), SCENES, (i) => { load(i); home.hide(); canvas.focus?.(); });
  document.getElementById('btn-home').onclick = () => home.show();
  document.getElementById('btn-theme').onclick = () => setTheme(st.theme === 'light' ? 'dark' : 'light');
  document.getElementById('btn-help').onclick = () => { st.help = !st.help; };
  const paramAt = (px, py) => hits.find((h) => h.kind === 'param' && inside(h.rect, px, py))?.key ?? null;
  const resultAt = (px, py) => hits.find((h) => h.kind === 'result' && inside(h.rect, px, py))?.key ?? null;
  // A hand is far less precise than a mouse: gestures get a wider catch zone around the mass and the chips.
  const pad = (r, d) => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
  const nearMass = (x, y) => { const p = sim.massPos(); return Math.hypot((x - p.x) * L.W, (y - p.y) * L.H) < 0.1 * L.H; };
  const hit = {
    massAt: (x, y) => sim.hits(x, y) || (sim.hits(sim.massPos().x, sim.massPos().y) && nearMass(x, y)),
    paramAt: (x, y) => hits.find((h) => h.kind === 'param' && inside(pad(h.rect, L.fontPx * 0.5), x * L.W, y * L.H))?.key ?? null,
    labelOf: (k) => params.specs.get(k)?.label ?? k,
  };
  // only re-derive the sim when the snapped value changed (phase2 setParams restarts the scene)
  const changeParam = (key, fn) => { const old = params.get(key); fn(); if (params.get(key) !== old) sim.setParams(params.values()); };
  const setParam = (key, v) => changeParam(key, () => params.set(key, v));

  function apply(a) {
    switch (a.type) {
      case 'togglePause': st.paused = !st.paused; break;
      case 'slowMo': st.slow = !st.slow; break;
      case 'nextLayer': st.layers = Math.min(scene.layers.length, st.layers + 1); break;
      case 'prevLayer': st.layers = Math.max(0, st.layers - 1); break;
      case 'nextStep': case 'prevStep': apply(clickerAction(a.type, st.layers, scene.layers.length)); break;
      case 'revealNext': reveal.revealNext(); break;
      case 'revealAll': reveal.revealAll(); break;
      case 'hideAll': reveal.hideAll(); break;
      case 'nextScene': load(sceneIdx + 1); break;
      case 'prevScene': load(sceneIdx - 1); break;
      case 'gotoScene': if (a.index < SCENES.length) load(a.index); break;
      case 'toggleTheme': setTheme(st.theme === 'light' ? 'dark' : 'light'); break;
      case 'toggleHome': home.show(); break;
      case 'toggleCamera': camShown = !camShown; break;
      case 'toggleHelp': st.help = !st.help; break;
      case 'closeHelp': st.help = false; break;
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
    if (home.open) {                                     // library screen: only 'm' / Esc go back to the lesson
      if (a.type === 'toggleHome' || a.type === 'closeHelp') { e.preventDefault(); home.hide(); }
      return;
    }
    e.preventDefault();
    if (a.type === 'toggleGestures') { if (!inputs.gesturesEnabled && grabbed) apply({ type: 'release' }); adj = null; gi = new GestureInterpreter(); }
    apply(a);
  });

  // Mouse parity with gestures: drag the mass, drag a param chip vertically, click a result chip, wheel a param chip.
  const norm = (e) => ({ x: e.offsetX / L.W, y: e.offsetY / L.H });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;                          // primary button / touch / pen only
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
    if (wheel.key !== key) wheel = { key, acc: 0 };
    const [n, acc] = wheelSteps(wheel.acc, e.deltaMode ? e.deltaY * 33 : e.deltaY);   // deltaMode 1: lines (~33 px)
    wheel.acc = acc;
    if (n) changeParam(key, () => { for (let i = 0; i < Math.abs(n); i++) params.stepBy(key, -n); });
  }, { passive: false });

  function resize() {
    L = layoutFor(canvas.clientWidth, canvas.clientHeight, devicePixelRatio || 1, rows);
    canvas.width = Math.round(L.W * L.dpr); canvas.height = Math.round(L.H * L.dpr);
  }
  addEventListener('resize', resize);

  function draw(t) {
    const res = results(), need = chipRows(ctx, L.chips, params, res, L.fontPx);
    if (need !== rows) { rows = need; L = layoutFor(L.W, L.H, L.dpr, rows); }   // stage starts below the chips
    const th = THEMES[st.theme], f = L.fontPx;
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, L.W, L.H);
    sim.draw(ctx, { layout: L, theme: th, layerCount: st.layers, paused: st.paused, time: t, reveal, results: res });
    hits = drawChips(ctx, L.chips, params, reveal, res, th, f);
    const shown = res.find((r) => r.key === reveal.last);
    if (shown) drawFormula(ctx, L.formula, shown, th, f);

    const status = [];   // scene title/lesson live in the lesson bar
    if (st.paused) status.push('⏸ Tạm dừng');
    if (st.slow) status.push('Chậm ×0,25');
    if (st.layers) status.push(scene.layers.slice(0, st.layers).join(' + '));
    ctx.font = `${f}px ${FONT}`; ctx.fillStyle = th.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    if (status.length) ctx.fillText(status.join(' · '), L.stage.x, L.stage.y, L.stage.w);

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
      if (gi.cursor && gi.lostSince === null) {              // only while the hand is visible
        ctx.beginPath(); ctx.arc(gi.cursor.x * L.W, gi.cursor.y * L.H, f * 0.35, 0, 2 * Math.PI);
        ctx.fillStyle = th.accent; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
      }
    }
  }

  // Camera gone (poll threw, track ended, no frame for > 3 s): keyboard and mouse carry on.
  function loseCamera() {
    cam.stop(); cam = null;
    inputs.cameraReady(false);
    if (grabbed) apply({ type: 'release' });
    adj = null; gi = new GestureInterpreter();
    showNotice(document.getElementById('notice'), LOST);
  }

  function pollCamera(t, dt) {
    if (camT === null || dt > 1 || video.currentTime !== camVT) { camVT = video.currentTime; camT = t; }   // dt > 1: tab was hidden
    let hands, failed = false;
    try { if (inputs.gesturesEnabled) hands = cam.poll(); } catch (e) { console.warn('camera', e); failed = true; }
    if (cameraLost({ failed, ended: cam.ended, sinceFrameS: t - camT })) { loseCamera(); return; }
    // a gesture grab caught by the wide zone grabs the mass itself (sim.grab needs an exact hit)
    if (hands && !home.open) gi.update(hands[0] && reach(hands[0]), t, hit).map((a) => (a.type === 'grab' ? { ...a, ...sim.massPos() } : a)).forEach(apply);
  }

  let last = null, logged = false;
  const logOnce = (e) => { if (!logged) { logged = true; console.error(e); } };
  function frame(ts) {
    requestAnimationFrame(frame);                    // first: an exception below must never stop the loop
    const t = ts / 1000, dt = last === null ? 0 : t - last;
    last = t;
    try { if (cam) pollCamera(t, dt); } catch (e) { logOnce(e); }
    try {
      sim.step(st.paused ? 0 : dt * (st.slow ? SLOW : 1));
      draw(t);
      if (st.help) drawHelp(ctx, L, THEMES[st.theme]);
    } catch (e) { logOnce(e); }
  }

  resize(); load(0); home.show();
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') main();
