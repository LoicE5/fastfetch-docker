import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const [image, platformList, ...flags] = process.argv.slice(2);
assert(image && platformList && !image.includes('@')
  && image.lastIndexOf(':') > image.lastIndexOf('/')
  && flags.every(flag => flag === '--dry-run'),
'Usage: node .github/scripts/tag-platforms.mjs IMAGE PLATFORMS [--dry-run]');
const platforms = platformList.split(',').sort();
assert(platforms.every(platform => /^linux\/(amd64|arm64)$/.test(platform)));

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 180_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

if (platforms.length > 1) {
  const index = JSON.parse(docker(['buildx', 'imagetools', 'inspect', '--raw', image]));
  assert(Array.isArray(index.manifests), 'Expected a multi-platform image index');
  assert.deepEqual(index.manifests.map(entry =>
    `${entry.platform.os}/${entry.platform.architecture}`).sort(), platforms,
  'Published platforms differ; refusing to tag components');
  for (const entry of index.manifests) {
    assert.match(entry.digest, /^sha256:[a-f0-9]{64}$/);
    const alias = `${image}-${entry.platform.architecture}`;
    console.log(`${alias} -> ${entry.digest}`);
    if (flags.includes('--dry-run')) continue;
    // Copy the existing manifest exactly; wrapping it in a new index would leave
    // the original platform manifest untagged in GHCR's version list.
    docker(['buildx', 'imagetools', 'create', '--prefer-index=false',
      '--tag', alias, `${image}@${entry.digest}`]);
    const copied = JSON.parse(docker(['buildx', 'imagetools', 'inspect',
      '--format', '{{json .Manifest}}', alias]));
    assert.equal(copied.digest, entry.digest, 'Alias changed the manifest digest');
  }
} else {
  console.log('Single-platform image already has a distro tag; no component aliases needed.');
}
