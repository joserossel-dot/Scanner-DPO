import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('Render declares every production runtime dependency without embedding secrets', async () => {
  const blueprint = await readFile(path.join(root, 'render.yaml'), 'utf8');
  assert.match(blueprint, /healthCheckPath:\s*\/health/);
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL']) {
    assert.match(blueprint, new RegExp(`- key: ${key}\\s+sync: false`));
  }
  assert.doesNotMatch(blueprint, /(?:postgres(?:ql)?|redis(?:s)?):\/\/[^\s]+/i);
});

test('SQL migrations have unique, increasing versions and are discoverable by the runner', async () => {
  const directory = path.join(root, 'backend/src/database/migrations');
  const files = (await readdir(directory))
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/i.test(name))
    .sort();
  assert.ok(files.length > 0, 'No versioned SQL migrations found');
  const versions = files.map((name) => Number(name.slice(0, 3)));
  assert.equal(new Set(versions).size, versions.length, 'Duplicate migration version');
  assert.deepEqual(versions, [...versions].sort((a, b) => a - b));
});

test('production start command uses the compiled backend and not a development watcher', async () => {
  const backendPackage = JSON.parse(await readFile(path.join(root, 'backend/package.json'), 'utf8'));
  assert.equal(backendPackage.scripts.start, 'node dist/index.js');
  assert.doesNotMatch(backendPackage.scripts.start, /tsx|watch|nodemon/i);
});
