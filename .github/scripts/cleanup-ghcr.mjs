import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Untagged platform manifests can still be required by a tagged image index.
export function planCleanup(versions, readManifest) {
  const protectedDigests = new Set();
  function protect(digest) {
    assert.match(digest, /^sha256:[a-f0-9]{64}$/, 'Invalid manifest digest');
    if (protectedDigests.has(digest)) return;
    protectedDigests.add(digest);
    const manifest = readManifest(digest);
    assert.equal(manifest.schemaVersion, 2, 'Unsupported manifest schema; aborting cleanup');
    if (manifest.manifests) {
      assert(Array.isArray(manifest.manifests), 'Invalid image index');
      for (const child of manifest.manifests) protect(child.digest);
    } else {
      assert(manifest.config && Array.isArray(manifest.layers), 'Invalid image manifest');
    }
    if (manifest.subject) protect(manifest.subject.digest);
  }
  for (const version of versions) {
    assert(Array.isArray(version.metadata?.container?.tags), 'Missing version tags');
    if (version.metadata.container.tags.length) protect(version.name);
  }
  return {
    protectedDigests,
    candidates: versions.filter(version => !version.metadata.container.tags.length
      && !protectedDigests.has(version.name)),
  };
}

function command(executable, args) {
  const result = spawnSync(executable, args, {
    encoding: 'utf8', timeout: 180_000, maxBuffer: 20 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${executable} failed: ${result.stderr}`);
  return result.stdout;
}

function main() {
  const [owner, ...flags] = process.argv.slice(2);
  assert(owner && /^[a-z0-9][a-z0-9-]*$/i.test(owner)
    && flags.every(flag => ['--org', '--delete'].includes(flag)),
  'Usage: node .github/scripts/cleanup-ghcr.mjs OWNER [--org] [--delete]');
  const endpoint = `${flags.includes('--org') ? 'orgs' : 'users'}/${owner}/packages/container/fastfetch/versions`;
  const image = `ghcr.io/${owner.toLowerCase()}/fastfetch`;
  const list = () => JSON.parse(command('gh', ['api', '--paginate', '--slurp',
    `${endpoint}?per_page=100`])).flat();
  const versions = list();
  const { protectedDigests, candidates } = planCleanup(versions, digest => JSON.parse(
    command('docker', ['buildx', 'imagetools', 'inspect', '--raw', `${image}@${digest}`])));
  console.log(`Protected ${protectedDigests.size} tagged or referenced manifests.`);
  console.log(`${candidates.length} untagged, unreferenced versions eligible for deletion:`);
  for (const version of candidates) console.log(`${version.id}\t${version.name}`);
  if (!flags.includes('--delete')) {
    console.log('Preview only. Add --delete to delete these versions. Stop publishing while cleaning up.');
    return;
  }
  // Abort if publication changed the inventory while references were inspected.
  const fingerprint = values => JSON.stringify(values.map(version => [version.id,
    version.name, [...version.metadata.container.tags].sort()]).sort((a, b) => a[0] - b[0]));
  assert.equal(fingerprint(list()), fingerprint(versions),
    'Package versions changed during inspection; retry with publishing stopped');
  for (const version of candidates) {
    command('gh', ['api', '--method', 'DELETE', `${endpoint}/${version.id}`]);
    console.log(`Deleted version ${version.id}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
