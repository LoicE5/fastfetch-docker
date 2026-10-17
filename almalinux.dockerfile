FROM almalinux:9-minimal

RUN microdnf install -y --setopt=install_weak_deps=0 epel-release \
    && microdnf install -y --setopt=install_weak_deps=0 fastfetch \
    && microdnf clean all \
    && rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
