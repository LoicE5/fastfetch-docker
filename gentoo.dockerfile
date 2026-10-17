FROM gentoo/stage3:latest AS builder

RUN emerge-webrsync

# Bootstrap signing keys for both the builder's verifier and the install root.
RUN mkdir -p /etc/portage/package.accept_keywords /etc/portage/package.use \
    && printf '%s\n' 'app-misc/fastfetch ~amd64 ~arm64' 'dev-libs/yyjson ~amd64 ~arm64' \
        > /etc/portage/package.accept_keywords/fastfetch \
    && printf '%s\n' 'app-misc/fastfetch -X -chafa -dbus -ddcutil -drm -efl -elf -gnome -imagemagick -lua -opencl -opengl -pulseaudio -sqlite -test -vaapi -vdpau -vulkan -wayland -xcb -xrandr' \
        > /etc/portage/package.use/fastfetch \
    && mkdir -p /runtime/usr/share/openpgp-keys \
    && cp /usr/share/openpgp-keys/gentoo-release.asc /runtime/usr/share/openpgp-keys/ \
    && getuto \
    && emerge --root=/runtime --root-deps=rdeps --getbinpkg --usepkg \
        --binpkg-respect-use=y --binpkg-changed-deps=n --with-bdeps=n \
        --jobs=2 app-misc/fastfetch sys-libs/glibc \
        sys-apps/baselayout app-shells/bash sys-apps/coreutils \
    && cp -L /etc/os-release /runtime/etc/os-release \
    && cp -L /etc/gentoo-release /runtime/etc/gentoo-release \
    && rm -rf /runtime/var/cache/* /runtime/var/tmp/* /runtime/etc/portage \
    && test -x /runtime/bin/sh \
    && test -x /runtime/usr/bin/fastfetch \
    && test ! -x /runtime/usr/bin/gcc

# Portage installs packages and their runtime dependencies into a separate root.
# The compiler, Portage, sources, and repository tree stay in the builder.
FROM scratch
COPY --from=builder /runtime/ /
LABEL org.opencontainers.image.base.name="gentoo/stage3:latest"
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

ENTRYPOINT ["fastfetch"]
