import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p.replaceAll('\\', '/')];
});
const sw = readFileSync('sw.js', 'utf8');
const PRECACHE = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
const listed = new Set(PRECACHE.map((p) => p.replace(/^\.\//, '')));

test('every PRECACHE entry exists and is relative', () => {
  for (const p of PRECACHE) {
    assert.ok(!p.startsWith('/'), `absolute: ${p}`);
    assert.ok(p === './' || existsSync(p), `missing on disk: ${p}`);
  }
});

test('every runtime file is in PRECACHE', () => {
  const runtime = ['index.html', 'styles.css', ...walk('src'), ...walk('vendor'), ...walk('models')];
  for (const f of runtime) assert.ok(listed.has(f), `not precached: ${f}`);
});

test('no root-absolute URLs in src or index.html', () => {
  for (const f of [...walk('src').filter((x) => x.endsWith('.js')), 'index.html']) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /(?:src="\/|href="\/|from '\/)/, f);
  }
});
