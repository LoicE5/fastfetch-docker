import assert from 'node:assert/strict';
import { readdirSync, readFileSync, appendFileSync } from 'node:fs';

// Only the selected Arch and Devuan bases lack ARM64. Everything else opts in.
const amd64Only = new Set(['arch', 'devuan']);
const files = readdirSync('.').filter(file => file.endsWith('.dockerfile')).sort();
assert(files.includes('windows.dockerfile'), 'Missing Windows recipe');
const include = files.filter(file => file !== 'windows.dockerfile').map(file => {
  const distro = file.slice(0, -'.dockerfile'.length);
  assert.match(distro, /^[a-z0-9][a-z0-9-]*$/, `Invalid tag: ${distro}`);
  assert.match(readFileSync(file, 'utf8'), /^ENTRYPOINT \["fastfetch"\]$/m,
    `${file} must forward arguments to Fastfetch`);
  return { distro, file, platforms: amd64Only.has(distro)
    ? 'linux/amd64' : 'linux/amd64,linux/arm64' };
});
assert(include.length > 0, 'No Linux recipes discovered');
for (const distro of amd64Only) {
  assert(include.some(entry => entry.distro === distro), `Missing ${distro} recipe`);
}
const matrix = JSON.stringify({ include });
console.log(matrix);
if (process.env.GITHUB_OUTPUT) {
  assert(process.env.GITHUB_REPOSITORY_OWNER, 'Missing repository owner');
  appendFileSync(process.env.GITHUB_OUTPUT,
    `matrix=${matrix}\nimage=ghcr.io/${process.env.GITHUB_REPOSITORY_OWNER.toLowerCase()}/fastfetch\n`);
}
