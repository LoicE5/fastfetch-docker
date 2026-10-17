FROM gentoo/stage3:latest

RUN emerge-webrsync \
    && mkdir -p /etc/portage/package.accept_keywords /etc/portage/package.use \
    && printf '%s\n' 'app-misc/fastfetch ~amd64 ~arm64' 'dev-libs/yyjson ~amd64 ~arm64' \
        > /etc/portage/package.accept_keywords/fastfetch \
    && printf '%s\n' 'app-misc/fastfetch -X -chafa -dbus -ddcutil -drm -efl -elf -gnome -imagemagick -lua -opencl -opengl -pulseaudio -sqlite -test -vaapi -vdpau -vulkan -wayland -xcb -xrandr' \
        > /etc/portage/package.use/fastfetch \
    && emerge --getbinpkg --usepkg --binpkg-respect-use=y --jobs=2 app-misc/fastfetch \
    && rm -rf /var/cache/distfiles/* /var/cache/binpkgs/* /var/tmp/portage/* /var/cache/edb/*

ENTRYPOINT ["fastfetch"]
