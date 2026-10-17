FROM oraclelinux:9-slim

RUN microdnf install -y --setopt=install_weak_deps=0 oracle-epel-release-el9 \
    && microdnf install -y --setopt=install_weak_deps=0 fastfetch \
    && microdnf clean all \
    && rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
