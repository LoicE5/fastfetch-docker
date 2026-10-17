FROM fedora:latest

RUN dnf install -y --setopt=install_weak_deps=False fastfetch \
    && dnf clean all \
    && rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
