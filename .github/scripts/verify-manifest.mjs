import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const [image, platformList] = process.argv.slice(2);
assert(image && platformList,
  'Usage: node .github/scripts/verify-manifest.mjs IMAGE PLATFORMS');
const result = spawnSync('docker', ['manifest', 'inspect', '--verbose', image],
  { encoding: 'utf8', timeout: 180_000 });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr);
const manifest = JSON.parse(result.stdout);
const entries = Array.isArray(manifest) ? manifest : [manifest];
const actual = entries.map(entry => {
  const { os, architecture, variant } = entry.Descriptor.platform;
  assert(!variant || (architecture === 'arm64' && variant === 'v8'),
    `Unexpected platform variant: ${variant}`);
  return `${os}/${architecture}`;
}).sort();
assert.deepEqual(actual, platformList.split(',').sort(), 'Published platforms differ');
console.log(`Verified ${image}: ${actual.join(', ')}`);
