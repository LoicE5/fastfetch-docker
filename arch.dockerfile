FROM archlinux:latest

# The download sandbox needs syscalls unavailable in some rootless/QEMU builders.
RUN pacman -Syu --noconfirm --disable-sandbox fastfetch \
    && pacman -Scc --noconfirm

ENTRYPOINT ["fastfetch"]
