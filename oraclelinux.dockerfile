FROM oraclelinux:9

RUN dnf install -y oracle-epel-release-el9 \
    && dnf install -y --setopt=install_weak_deps=False fastfetch \
    && dnf clean all \
    && rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
