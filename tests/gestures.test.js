import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, OPEN, FIST } from '../src/input/gestures.js';

// 21 synthetic landmarks: wrist at bottom, 4 fingers (MCP/PIP/TIP) fanned left-right, tip y varies.
function hand(tipY, thumb) {
  const lm = Array.from({ length: 21 }, () => [0.5, 0.9]);
  lm[4] = thumb;
  [5, 9, 13, 17].forEach((mcp, i) => {
    const x = 0.4 + i * 0.07;
    lm[mcp] = [x, 0.7]; lm[mcp + 1] = [x, 0.6]; lm[mcp + 3] = [x, tipY];
  });
  return lm;
}

test('classify open hand', () => assert.equal(classify(hand(0.4, [0.2, 0.7])), OPEN));
test('classify fist', () => assert.equal(classify(hand(0.72, [0.45, 0.72])), FIST));
