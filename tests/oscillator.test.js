import test from 'node:test';
import assert from 'node:assert/strict';
import { SpringOscillator, PendulumOscillator, MAX_DT } from '../src/physics/oscillator.js';
import { positionAt } from '../src/physics/formulas.js';

const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test('undamped spring matches x = A cos(ωt) after 100 s', () => {
  const s = new SpringOscillator({ k: 100, m: 1 }); s.set(0.05, 0);
  for (let i = 0; i < 6000; i++) s.step(1 / 60);
  close(s.x, positionAt(0.05, 10, 0, s.t), 1e-4);
});
test('energy conserved without damping', () => {
  const s = new SpringOscillator({ k: 100, m: 1 }); s.set(0.05, 0);
  const E = () => 0.5 * 100 * s.x ** 2 + 0.5 * s.v ** 2;
  const E0 = E();
  for (let i = 0; i < 1800; i++) s.step(1 / 60);
  assert.ok(Math.abs(E() - E0) / E0 < 1e-6);
});
test('damped amplitude decays', () => {
  const s = new SpringOscillator({ k: 100, m: 1, b: 0.5 }); s.set(0.05, 0);
  let max = 0;
  for (let i = 0; i < 600; i++) {
    s.step(1 / 60);
    if (s.t > 10 - 0.63) max = Math.max(max, Math.abs(s.x));
  }
  assert.ok(max < 0.5 * 0.05, `${max}`);
});
test('huge dt is clamped, no blow-up', () => {
  const s = new SpringOscillator({ k: 100, m: 1 }); s.set(0.05, 0);
  s.step(5); assert.ok(Math.abs(s.x) <= 0.0501); close(s.t, MAX_DT);
});
test('stiffest setting stays stable', () => {
  const s = new SpringOscillator({ k: 1000, m: 0.05 }); s.set(0.1, 0);
  for (let i = 0; i < 600; i++) s.step(1 / 60);
  assert.ok(Math.abs(s.x) <= 0.1001);
});
test('small-angle pendulum period ≈ 2π√(ℓ/g)', () => {
  const p = new PendulumOscillator({ l: 1, g: 9.8 }); p.set(5 * Math.PI / 180, 0);
  const zc = []; let prev = p.alpha;
  for (let i = 0; i < 5000 && zc.length < 2; i++) {
    p.step(0.001);
    if (prev > 0 && p.alpha <= 0) zc.push(p.t - 0.001 + 0.001 * prev / (prev - p.alpha));
    prev = p.alpha;
  }
  assert.equal(zc.length, 2);
  const T = zc[1] - zc[0]; // consecutive downward crossings
  assert.ok(Math.abs(T / 2.0071 - 1) < 0.005, `${T}`);
});
test('forced near resonance grows larger than off resonance', () => {
  const run = (f) => {
    const s = new SpringOscillator({ k: 100, m: 1, b: 0.2, F0: 0.5, f });
    let max = 0;
    for (let i = 0; i < 1800; i++) { s.step(1 / 60); max = Math.max(max, Math.abs(s.x)); }
    return max;
  };
  assert.ok(run(10 / (2 * Math.PI)) > 2 * run(20 / (2 * Math.PI)));
});
