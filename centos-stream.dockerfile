FROM quay.io/centos/centos:stream9

RUN dnf install -y epel-release \
    && dnf install -y --setopt=install_weak_deps=False fastfetch \
    && dnf clean all \
    && rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
