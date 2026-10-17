# The official Nix image provides Nix and its executable profile, not full NixOS.
FROM nixos/nix:latest

# Emulators may not support Nix's syscall filter; apply this only to the build.
RUN nix-env --option filter-syscalls false --profile /nix/var/nix/profiles/default \
        --install --attr nixpkgs.fastfetch \
    && nix-collect-garbage --delete-old \
    && rm -rf /root/.cache/nix

# This scratch-based Nix image omits os-release. Describe the container accurately
# so Fastfetch's OS module works, without claiming it is a NixOS installation.
RUN printf '%s\n' 'NAME="Nix"' 'ID=nix' 'PRETTY_NAME="Nix (official container image)"' \
        > /etc/os-release

ENTRYPOINT ["fastfetch"]
