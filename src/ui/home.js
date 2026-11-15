// Library screen (DOM, not canvas): Lớp → Học kì → chapter cards → lesson rows with their simulations.
import { CATALOG } from './catalog.js';

const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5Z"/></svg>';
const WAVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c2.5-6 5-6 7.5 0s5 6 7.5 0 3.5-4.5 5-3"/></svg>';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Counts for the meter: lessons of a chapter that already have a simulation. */
export const coverage = (chapter) => ({ done: chapter.lessons.filter((l) => l.scenes.length).length, all: chapter.lessons.length });

function load() { try { return JSON.parse(localStorage.getItem('lib') || '{}'); } catch { return {}; } }
function save(v) { try { localStorage.setItem('lib', JSON.stringify(v)); } catch { /* private mode: not remembered */ } }

/**
 * root: the <main id="home"> element. scenes: [{id, title}] in key order. onPick(index): open that simulation.
 * Returns { show(), hide(), open }.
 */
export function createHome(root, scenes, onPick) {
  const byId = new Map(scenes.map((s, i) => [s.id, { i, title: s.title }]));
  const st = { grade: 11, sem: 1, ...load() };

  function render() {
    const chapters = CATALOG[st.grade].filter((c) => c.sem === st.sem);
    const sims = chapters.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.scenes.length, 0), 0);
    const seg = (key, vals, label) => `<div class="seg" role="group" aria-label="${label}">${vals.map(([v, t]) =>
      `<button type="button" data-${key}="${v}" aria-pressed="${st[key] === v}">${t}</button>`).join('')}</div>`;
    root.innerHTML = `<div class="home-in">
      <div class="brand"><div class="mark">${WAVE}</div><div><h1>Phòng thí nghiệm Vật lí</h1>
        <p>Mô phỏng theo SGK Kết nối tri thức · điều khiển bằng cử chỉ tay, chuột hoặc bàn phím</p></div></div>
      <div class="filters">
        ${seg('grade', [[10, 'Lớp 10'], [11, 'Lớp 11'], [12, 'Lớp 12']], 'Chọn lớp')}
        ${seg('sem', [[1, 'Học kì 1'], [2, 'Học kì 2']], 'Chọn học kì')}
        <span class="count">${sims ? `${sims} mô phỏng sẵn sàng` : 'Chưa có mô phỏng — sắp ra mắt'}</span>
      </div>
      <div class="grid">${chapters.map(card).join('')}</div>
      <p class="tip">Mẹo: <kbd>F1</kbd> xem phím và cử chỉ · <kbd>M</kbd> mở/đóng thư viện · <kbd>F11</kbd> toàn màn hình</p>
    </div>`;
  }

  function card(c) {
    const { done, all } = coverage(c);
    const rows = c.lessons.map((l) => `<li><span class="ltitle"><small>Bài ${l.n}</small>${esc(l.t)}</span>${l.scenes.length
      ? `<div class="sims">${l.scenes.map((id) => byId.has(id)
        ? `<button type="button" class="sim" data-scene="${byId.get(id).i}">${PLAY}${esc(byId.get(id).title)}</button>` : '').join('')}</div>`
      : '<span class="soon">Sắp có</span>'}</li>`).join('');
    return `<section class="card${done ? ' has' : ''}" aria-label="Chương ${esc(c.no)}: ${esc(c.title)}">
      <header><span class="chap">Chương ${esc(c.no)}</span><h2>${esc(c.title)}</h2></header>
      <div class="meter" aria-hidden="true"><i style="width:${(100 * done) / all}%"></i></div>
      <span class="meta">${done}/${all} bài có mô phỏng</span>
      <ul class="lessons">${rows}</ul></section>`;
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.grade) { st.grade = +b.dataset.grade; save({ grade: st.grade, sem: st.sem }); render(); }
    else if (b.dataset.sem) { st.sem = +b.dataset.sem; save({ grade: st.grade, sem: st.sem }); render(); }
    else if (b.dataset.scene) onPick(+b.dataset.scene);
  });

  const api = {
    open: false,
    show() { render(); root.hidden = false; api.open = true; root.querySelector('.sim, .seg button')?.focus(); },
    hide() { root.hidden = true; api.open = false; },
  };
  return api;
}
