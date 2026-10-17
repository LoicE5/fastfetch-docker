# Fastfetch container images

Fastfetch packaged for 26 Linux environments and Windows Server Core.

Each image runs [Fastfetch](https://github.com/fastfetch-cli/fastfetch) by default
and forwards its normal command-line arguments. Images are published as
`ghcr.io/<owner>/fastfetch:<tag>`; replace `<owner>` with the lowercase GitHub
user or organization that owns this repository.

```sh
docker run --rm -t ghcr.io/<owner>/fastfetch:alpine
docker run --rm ghcr.io/<owner>/fastfetch:alpine --version
docker run --rm ghcr.io/<owner>/fastfetch:alpine --format json --structure OS
```

Use `-t` for colored terminal output. Without a terminal, Fastfetch automatically
disables some styling; the color swatches can still appear. Setting `TERM` alone
does not allocate a terminal. Keep JSON commands without `-t`. For an ANSI-capable
output stream without a terminal, pass `--pipe false` explicitly. Fastfetch's
default colors apply to its logo and labels; ordinary values are usually white.
Your host's custom Fastfetch configuration is not included in these images.

## Tags and platforms

Linux tags support **linux/amd64 and linux/arm64**, except `arch` and `devuan`,
whose selected base images currently support **linux/amd64 only**.
`windows` supports **windows/amd64 only**.

Multi-platform Linux tags also publish `<tag>-amd64` and `<tag>-arm64` aliases
for their component images, giving those GHCR versions readable names. The
ordinary `<tag>` still selects the appropriate architecture automatically.

| Tag | Base / build source | Installation |
| --- | --- | --- |
| `ubuntu` | `ubuntu:latest` | APT |
| `debian` | `debian:stable-slim` | APT |
| `alpine` | `alpine:latest` | APK |
| `fedora` | `registry.fedoraproject.org/fedora-minimal:latest` | MicroDNF |
| `almalinux` | `almalinux:9-minimal` | MicroDNF + EPEL |
| `ubi9` | `registry.access.redhat.com/ubi9/ubi-micro:latest` | AlmaLinux 9 install-root builder + EPEL |
| `arch` | `archlinux:latest` | Pacman |
| `rockylinux` | `rockylinux/rockylinux:9-minimal` | MicroDNF + EPEL |
| `centos-stream` | `quay.io/centos/centos:stream9-minimal` | MicroDNF + EPEL |
| `oraclelinux` | `oraclelinux:9-slim` | MicroDNF + Oracle EPEL |
| `amazonlinux` | `public.ecr.aws/amazonlinux/amazonlinux:2023-minimal` | MicroDNF for dependencies; official polyfilled Fastfetch RPM through RPM |
| `opensuse` | `opensuse/tumbleweed:latest` | Zypper |
| `opensuse-leap` | `opensuse/leap:latest` | Zypper |
| `kali` | `kalilinux/kali-rolling:latest` | APT |
| `parrot` | `parrotsec/core:latest` | APT |
| `devuan` | `devuan/devuan:stable` | APT |
| `void` | `ghcr.io/void-linux/void-glibc-busybox:latest` | XBPS |
| `void-musl` | `ghcr.io/void-linux/void-musl-busybox:latest` | XBPS |
| `gentoo` | `gentoo/stage3:latest` (builder) | Portage packages installed into a separate runtime root; prefer binaries |
| `nix` | `nixos/nix:latest` | Nix, installed into its executable profile |
| `alt` | `alt:sisyphus` | APT-RPM |
| `mageia` | `mageia:cauldron` | Urpmi |
| `photon` | `photon:latest` | Official polyfilled Fastfetch RPM through TDNF |
| `openeuler` | `openeuler/openeuler:latest` | Official polyfilled Fastfetch RPM through DNF |
| `wolfi` | `cgr.dev/chainguard/wolfi-base:latest` | APK |
| `openmandriva` | `openmandriva/cooker:latest` | DNF |
| `windows` | `mcr.microsoft.com/windows/servercore:ltsc2025` | Official AMD64 ZIP |

Recipes follow [Fastfetch's installation guidance](https://github.com/fastfetch-cli/fastfetch#installation)
and use distribution packages where available. Package versions differ between
distributions. RPM and ZIP downloads resolve the current stable upstream release
at build time. Linux downloads use the polyfilled RPMs for older glibc compatibility;
Docker's `arm64` maps to upstream's `aarch64`.

Base tags such as `9`, `2023`, and `ltsc2025` receive updates within their OS
release. They are mutable tags, like `latest`; `latest` can also move to a new
major release. Even when a base digest stays unchanged, a fresh build can install
newer distribution packages or download a newer Fastfetch release.

The `nix` tag uses the official **Nix image**, not a full NixOS system. Because its
base omits `os-release`, the recipe adds an identity describing the Nix container
so Fastfetch can return OS information. The `ubi9`
tag retains the UBI micro root and RHEL release identity, but contains Fastfetch
and dependencies from AlmaLinux/EPEL. It is not an entirely Red Hat-supplied
image. Its final stage contains no package-manager executables or build tools.

The RPM-based variants use smaller minimal/slim bases and MicroDNF where
available. Amazon Linux uses RPM to install the downloaded Fastfetch package
because MicroDNF does not support local RPM installation; dependency checking
remains enabled. Both Void variants use their published BusyBox bases.

Gentoo's final image contains a minimal Gentoo runtime assembled by Portage,
including its package database and release identity. Its compiler, Portage, and
repository tree stay in the build stage. An OCI base-name label records the source
image so verification can still compare its distro identity.

Gentoo and Nix omit optional desktop and multimedia integrations to reduce their
runtime dependencies. Core Fastfetch output and OS JSON reporting remain
available. Windows keeps Server Core because Nano Server's reduced API surface
has not been verified for the official Fastfetch executable.

## Local builds and checks

Run from the repository root with Docker and Buildx available:

```sh
docker build --pull --file alpine.dockerfile --tag fastfetch:alpine .
docker run --rm fastfetch:alpine --version
docker run --rm -t fastfetch:alpine
docker run --rm fastfetch:alpine --format json --structure OS
node .github/scripts/verify-linux.mjs fastfetch:alpine linux/arm64 alpine.dockerfile
```

Use your host's platform for the last command (`linux/amd64` on an x86-64 host).
The verifier requires Node.js and a recent Docker CLI with
`docker image inspect --platform` support. It also runs the final base image to
compare release identity. To build both architectures locally:

```sh
docker buildx build --pull --platform linux/amd64,linux/arm64 \
  --file alpine.dockerfile --tag fastfetch:alpine --load .
node .github/scripts/verify-linux.mjs fastfetch:alpine linux/amd64,linux/arm64 alpine.dockerfile
```

Multi-platform `--load` needs Docker's
[containerd image store](https://docs.docker.com/build/ci/github-actions/multi-platform/),
plus native execution or QEMU support for each platform. A classic Docker image
store can load and test one architecture at a time.

Some AMD64 emulators on ARM64 hosts cause XBPS in the Void glibc base to fail
with HTTP 416 during repository sync
([upstream issue](https://github.com/void-linux/void-containers/issues/21)).
Use a native AMD64 host for that build. The workflow uses native AMD64 execution
for this platform.

Windows images require a compatible
[Windows container host](https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment)
for Server Core LTSC 2025. In PowerShell on that host:

```powershell
docker build --pull --file windows.dockerfile --tag fastfetch:windows .
./.github/scripts/verify-windows.ps1 -Image fastfetch:windows
docker run --rm -t fastfetch:windows
```

Check `docker info --format '{{.OSType}}'`: it must print `windows` for this tag.
On a supported Windows machine, switch Docker Desktop to **Windows containers**.
Linux containers on Windows (WSL2 included), Linux hosts, and macOS cannot run
this Windows image. `--platform windows/amd64` does not add a Windows kernel.
An extraction failure mentioning `overlayfs` and Windows paths indicates the
Windows image is being handled by a Linux daemon; use a compatible Windows
container host. Linux distro tags continue to require a Linux daemon.

## Verification helpers

The workflow uses small scripts that can also run locally:

- [discover.mjs](.github/scripts/discover.mjs) finds Dockerfiles and selects their architectures.
- [verify-linux.mjs](.github/scripts/verify-linux.mjs) checks Fastfetch execution and Linux distro identity.
- [verify-manifest.mjs](.github/scripts/verify-manifest.mjs) checks published image platforms.
- [tag-platforms.mjs](.github/scripts/tag-platforms.mjs) names the existing platform manifests without changing their digests.
- [verify-windows.ps1](.github/scripts/verify-windows.ps1) checks Fastfetch execution and Windows identity.
- [cleanup-ghcr.mjs](.github/scripts/cleanup-ghcr.mjs) previews or deletes obsolete GHCR versions while preserving referenced platform manifests.

The `.mjs` scripts require Node.js; the Windows script uses PowerShell. The
Dockerfiles can be built directly with Docker independently of these helpers.

## Automation and publication

[The workflow](.github/workflows/images.yml) runs only by manual dispatch and at
**04:17 UTC on the first of each month**. Every run pulls fresh base images and
disables build-layer reuse. Linux jobs use `ubuntu-24.04`
runners so runner upgrades are explicit. Windows uses the Docker CLI
on a fresh `windows-2025` runner.

Root-level `*.dockerfile` files are discovered automatically. Adding an ordinary
Linux distro requires only a self-contained Dockerfile with
`ENTRYPOINT ["fastfetch"]`; it receives AMD64 and ARM64 builds automatically.
Update the platform exceptions only when the chosen base needs an exception.
Linux runs up to six distro jobs at once with `fail-fast: false`.

Linux uses Buildx, QEMU, and Docker's documented containerd image-store setup
to load all requested platforms. Every supported platform must pass `--version`,
default execution, and an OS-information JSON check. Release identity is compared
with the base where provided; UBI9 must still identify as RHEL and contain no
package-manager executables or build tools. The Windows job performs the same
three execution checks and validates Windows identity. Gentoo also verifies that
its runtime excludes compiler and Portage executables.

Only runs on `main` publish. Manual runs on other branches build and test without
logging in or pushing. The workflow pushes the image it tested, then inspects the registry
manifest and requires exactly the expected platforms:

```sh
node .github/scripts/discover.mjs
actionlint .github/workflows/images.yml
node .github/scripts/verify-manifest.mjs ghcr.io/<owner>/fastfetch:alpine linux/amd64,linux/arm64
```

Publication uses the repository's `GITHUB_TOKEN` with `contents: read` and
`packages: write`; no personal token is needed. Allow Actions to write packages
in the repository/organization settings. If `fastfetch` already exists in GHCR,
grant this repository Actions access under the package's **Manage Actions access**
settings. Organization policies may restrict package creation or public visibility.

New GHCR packages are private by default. After the first successful publication,
open the owner's **Packages → fastfetch → Package settings → Change visibility**
and make the package public to allow anonymous pulls. All tags share that package.
GitHub may delay scheduled runs. Scheduled workflows use the default branch;
configure `main` as the repository's default branch to enable scheduled publishing.

## GHCR digest entries and cleanup

A multi-platform tag points to an image index, which references separate AMD64
and ARM64 manifests. Without their own tags, GHCR lists those manifests as
untagged `sha256:…` versions. They are required: deleting them breaks pulls for
those architectures. For example, the two digest entries below `alpine` are its
platform manifests. These are not
build attestations; provenance and SBOM publication are already disabled.
The workflow tags them as `alpine-amd64` and `alpine-arm64` (and similarly for
other distros), so GHCR can show names instead of bare digests. It reuses the
exact manifests; it does not rebuild or duplicate their layers. Single-platform
tags already name their sole image and need no aliases.

The new workflow applies these names on the next publication. To name an
existing published tag without rebuilding it, log Docker in to GHCR with package
write access and run, for example:

```sh
node .github/scripts/tag-platforms.mjs ghcr.io/loice5/fastfetch:alpine linux/amd64,linux/arm64
```

Add `--dry-run` to inspect the naming plan without writing to the registry.

Old manifests no longer referenced by any tagged image can be removed. With
Node.js, Docker Buildx, and the GitHub CLI installed, authenticate `gh` with
`read:packages` and `delete:packages` scopes and package admin access. Private
packages also require Docker to be logged in to GHCR. Stop publishing while
running cleanup, then preview and delete eligible versions:

```sh
node .github/scripts/cleanup-ghcr.mjs loice5
node .github/scripts/cleanup-ghcr.mjs loice5 --delete
```

Use `--org` for an organization-owned package. The script inventories all pages,
walks every tagged image's manifest references, and aborts on inspection errors.
It preserves tagged versions and their referenced manifests, even when those
manifests have no tags of their own. It does not delete anything by default.
If all digest entries are still referenced, there is nothing eligible to delete.
