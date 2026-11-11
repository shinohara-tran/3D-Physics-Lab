import test from 'node:test';
import assert from 'node:assert/strict';
import { num, withUnit, phase } from '../src/format.js';

test('num', () => {
  assert.equal(num(0.6283), '0,63');
  assert.equal(num(5), '5');
  assert.equal(num(-2.5), '\u22122,5');
  assert.equal(num(-0.001), '0');
  assert.equal(num(10), '10');
  assert.equal(num(1.5, 0), '2');
});
test('withUnit', () => assert.equal(withUnit(0.6283, 's', 2), '0,63 s'));
test('phase', () => {
  assert.equal(phase(Math.PI / 6), 'π/6');
  assert.equal(phase(-Math.PI / 2), '\u2212π/2');
  assert.equal(phase(Math.PI), 'π');
  assert.equal(phase(0), '0');
  assert.equal(phase(5 * Math.PI / 12), '5π/12');
  assert.equal(phase(0.4456), '0,45 rad');
});
