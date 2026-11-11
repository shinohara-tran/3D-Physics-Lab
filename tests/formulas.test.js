import test from 'node:test';
import assert from 'node:assert/strict';
import {
  omegaSpring, omegaPendulum, period, frequency, vMax, aMax, energy,
  staticStretch, fromInitial, positionAt, steadyAmplitude,
} from '../src/physics/formulas.js';

const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

// SGK 11 Bài 4, Ví dụ 1 (tr.17): x = 5cos(10πt + π/6) cm
test('VD1 Bài 4: f, x(0,05)', () => {
  const w = 10 * Math.PI;
  close(frequency(w), 5);
  close(positionAt(0.05, w, Math.PI / 6, 0.05), -0.025);
});
// SGK 11 Bài 4, Ví dụ 2 (tr.17): f = 2 Hz, x0 = 5 cm, v0 = −30 cm/s
test('VD2 Bài 4: A, φ, vmax, amax', () => {
  const w = 2 * Math.PI * 2;
  const { A, phi } = fromInitial(0.05, -0.30, w);
  close(A, 0.055407, 1e-5); close(phi, 0.44546, 1e-4);
  close(vMax(w, A), 0.6963, 1e-3); close(aMax(w, A), 8.749, 1e-2);
});
// SGK 11 Bài 1, câu hỏi (tr.7): x = 2cos(4πt + π/2) cm, t = 2 s → x = 0
test('Bài 1: x(2) = 0', () => close(positionAt(0.02, 4 * Math.PI, Math.PI / 2, 2), 0, 1e-9));
// SGK 11 Bài 7, Ví dụ 2 (tr.28): m = 200 g, ω = 2π, A = 10 cm, v = 10 cm/s
test('VD2 Bài 7: W, Wđ, Wt', () => {
  const W = energy(0.2, 2 * Math.PI, 0.1);
  close(W, 0.039478, 1e-6);
  close(W - 0.5 * 0.2 * 0.1 ** 2, 0.038478, 1e-6);
});
test('T lò xo, T con lắc đơn, Δℓ0', () => {
  close(period(omegaSpring(100, 1)), 0.6283, 1e-4);
  close(period(omegaPendulum(9.8, 1)), 2.0071, 1e-4);
  close(staticStretch(0.1, 10, 100), 0.01);
});
test('k×4 ⇒ T/2', () => close(period(omegaSpring(400, 1)) / period(omegaSpring(100, 1)), 0.5));
test('fromInitial at rest: +x0 → φ=0, −x0 → φ=π', () => {
  close(fromInitial(0.05, 0, 10).phi, 0); close(fromInitial(-0.05, 0, 10).phi, Math.PI);
  close(fromInitial(-0.05, -0, 10).phi, Math.PI);
});
test('resonance peak at Ω = ω0 for small b', () => {
  const at = (O) => steadyAmplitude(1, 1, 10, 0.2, O);
  assert.ok(at(10) > at(9) && at(10) > at(11));
});
