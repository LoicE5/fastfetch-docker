import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planCleanup } from './cleanup-ghcr.mjs';

const digest = character => `sha256:${character.repeat(64)}`;
const version = (id, character, tags = []) => ({
  id, name: digest(character), metadata: { container: { tags } },
});
const versions = [version(1, 'a', ['alpine']), version(2, 'b'), version(3, 'c'),
  version(4, 'd'), version(5, 'e'), version(6, 'f')];
const image = { schemaVersion: 2, config: {}, layers: [] };
const manifests = {
  [digest('a')]: { schemaVersion: 2, manifests: [{ digest: digest('b') }, { digest: digest('c') }] },
  [digest('b')]: image,
  [digest('c')]: { schemaVersion: 2, manifests: [{ digest: digest('d') }] },
  [digest('d')]: { ...image, subject: { digest: digest('e') } },
  [digest('e')]: image,
};

test('preserves tagged indexes, nested platforms, and subjects; selects only orphans', () => {
  const plan = planCleanup(versions, name => manifests[name]);
  assert.deepEqual(plan.candidates.map(value => value.id), [6]);
  assert.equal(plan.protectedDigests.size, 5);
});

test('unknown schemas, missing tags, and unreadable references abort cleanup', () => {
  assert.throws(() => planCleanup(versions, () => ({ schemaVersion: 1 })));
  assert.throws(() => planCleanup([{ name: digest('a') }], () => image));
  assert.throws(() => planCleanup(versions, () => { throw Error('unreadable'); }));
});

function runCLI(flags, scenario = '') {
  const directory = mkdtempSync(join(tmpdir(), 'fastfetch-cleanup-test-'));
  try {
    writeFileSync(join(directory, 'fixture.json'), JSON.stringify({ versions, manifests }));
    const mock = `#!${process.execPath}
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
const dir = process.env.CLEANUP_TEST_DIR;
const { versions, manifests } = JSON.parse(readFileSync(join(dir, 'fixture.json')));
const args = process.argv.slice(2);
if (basename(process.argv[1]) === 'gh') {
  if (args.includes('DELETE')) {
    appendFileSync(join(dir, 'deletions'), args.at(-1) + '\\n');
  } else {
    const counter = join(dir, 'listed');
    const again = existsSync(counter);
    writeFileSync(counter, 'yes');
    if (again && process.env.CLEANUP_TEST_SCENARIO === 'race') versions.at(-1).metadata.container.tags = ['new'];
    console.log(JSON.stringify([versions.slice(0, 3), versions.slice(3)]));
  }
} else {
  if (process.env.CLEANUP_TEST_SCENARIO === 'error') process.exit(1);
  console.log(JSON.stringify(manifests[args.at(-1).split('@')[1]]));
}
`;
    for (const executable of ['gh', 'docker']) {
      writeFileSync(join(directory, executable), mock, { mode: 0o755 });
    }
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./cleanup-ghcr.mjs', import.meta.url)),
      'loice5', ...flags], { encoding: 'utf8', env: {
      ...process.env, PATH: `${directory}${delimiter}${process.env.PATH}`,
      CLEANUP_TEST_DIR: directory, CLEANUP_TEST_SCENARIO: scenario,
    } });
    let deletions = '';
    try { deletions = readFileSync(join(directory, 'deletions'), 'utf8'); } catch {}
    return { ...result, deletions };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('CLI previews by default and deletes only the unreferenced version when requested', () => {
  const preview = runCLI([]);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(preview.deletions, '');
  const deletion = runCLI(['--delete']);
  assert.equal(deletion.status, 0, deletion.stderr);
  assert.equal(deletion.deletions, 'users/loice5/packages/container/fastfetch/versions/6\n');
});

test('CLI never deletes after inspection errors or concurrent publication', () => {
  for (const scenario of ['error', 'race']) {
    const result = runCLI(['--delete'], scenario);
    assert.notEqual(result.status, 0);
    assert.equal(result.deletions, '');
  }
});
