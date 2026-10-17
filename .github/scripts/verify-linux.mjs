import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [image, platformList, file] = process.argv.slice(2);
assert(image && platformList && file,
  'Usage: node .github/scripts/verify-linux.mjs IMAGE PLATFORMS DOCKERFILE');
const stages = [...readFileSync(file, 'utf8').matchAll(/^FROM\s+(\S+)/gmi)];
const base = stages.at(-1)?.[1];
assert(base, 'Cannot identify final base image');

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 180_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0,
    `docker ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

const releaseCommand = 'if [ -r /etc/os-release ]; then cat /etc/os-release; '
  + 'elif [ -r /usr/lib/os-release ]; then cat /usr/lib/os-release; fi';
function releaseFields(output) {
  return Object.fromEntries(output.split('\n').flatMap(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^["']|["']$/g, '')]] : [];
  }));
}

for (const platform of platformList.split(',')) {
  assert.match(platform, /^linux\/(amd64|arm64)$/);
  console.log(`Testing ${image} on ${platform}`);
  const metadata = JSON.parse(docker(['image', 'inspect', '--platform', platform, image]))[0];
  assert.equal(`${metadata.Os}/${metadata.Architecture}`, platform, 'Wrong loaded platform');
  // A runtime assembled from packages records its source distro in the OCI label.
  const identityBase = base === 'scratch'
    ? metadata.Config.Labels?.['org.opencontainers.image.base.name'] : base;
  assert(identityBase && identityBase !== 'scratch', 'Missing source distro image');
  assert(stages.some(stage => stage[1] === identityBase), 'Source distro must be a declared build stage');
  const run = (...args) => docker(['run', '--rm', '--platform', platform, image, ...args]);
  const version = run('--version');
  assert.match(version, /fastfetch\s+\d+\./i, 'Invalid version output');
  console.log(version);
  assert(run().length > 0, 'Default execution produced no output');
  const terminal = docker(['run', '--rm', '--tty', '--platform', platform, image,
    '--logo', 'none', '--structure', 'OS']);
  assert.match(terminal, /\x1b\[[0-9;]*m/, 'Terminal output is missing ANSI styling');
  const modules = JSON.parse(run('--format', 'json', '--structure', 'OS'));
  const os = modules.find(module => module.type === 'OS');
  assert(os?.result && !os.error, `OS detection failed: ${JSON.stringify(modules)}`);
  assert(os.result.name || os.result.prettyName, 'Missing OS name');

  // Compare with the actual base rather than maintaining another distro list.
  const expected = releaseFields(docker(['run', '--rm', '--platform', platform,
    '--entrypoint', '/bin/sh', identityBase, '-c', releaseCommand]));
  const actual = releaseFields(docker(['run', '--rm', '--platform', platform,
    '--entrypoint', '/bin/sh', image, '-c', releaseCommand]));
  for (const key of ['ID', 'NAME', 'VERSION_ID']) {
    if (expected[key]) assert.equal(actual[key], expected[key], `${key}: changed base identity`);
  }
  if (expected.ID) assert.equal(os.result.id, expected.ID, 'Fastfetch reports another distro');
  if (file === 'ubi9.dockerfile') {
    assert.equal(expected.ID, 'rhel', 'UBI base must identify as RHEL');
    assert.equal(os.result.id, 'rhel', 'UBI image lost its RHEL identity');
    docker(['run', '--rm', '--platform', platform, '--entrypoint', '/bin/sh', image,
      '-ec', 'for cmd in dnf yum microdnf rpm gcc cc make cmake; do '
        + 'if command -v "$cmd"; then exit 1; fi; done']);
  }
  if (file === 'gentoo.dockerfile') {
    assert.equal(os.result.id, 'gentoo', 'Gentoo runtime lost its distro identity');
    docker(['run', '--rm', '--platform', platform, '--entrypoint', '/bin/sh', image,
      '-ec', 'for cmd in gcc cc g++ make cmake emerge; do '
        + 'if command -v "$cmd"; then exit 1; fi; done']);
  }
  if (file === 'gentoo.dockerfile' || file === 'nix.dockerfile') {
    const packages = JSON.parse(run('--format', 'json', '--structure', 'Packages'))
      .find(module => module.type === 'Packages');
    assert(packages?.result && !packages.error, 'Package detection failed');
    if (file === 'gentoo.dockerfile') {
      assert(Object.entries(packages.result).some(([key, value]) => key.startsWith('emerge') && value > 0),
        'Missing Gentoo package database');
    } else {
      assert(Object.entries(packages.result).some(([key, value]) => key.startsWith('nix') && value > 0),
        'Missing Nix profile package information');
      docker(['run', '--rm', '--platform', platform, '--entrypoint', '/bin/sh', image,
        '-ec', 'command -v nix-env; command -v fastfetch']);
    }
  }
  console.log(`Passed ${platform}: ${os.result.prettyName || os.result.name}`);
}
