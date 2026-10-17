FROM registry.fedoraproject.org/fedora-minimal:latest

RUN microdnf install -y --setopt=install_weak_deps=0 fastfetch \
    && microdnf clean all \
    && rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
