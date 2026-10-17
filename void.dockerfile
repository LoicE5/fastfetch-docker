FROM ghcr.io/void-linux/void-glibc:latest

RUN xbps-install -Syu xbps \
    && xbps-install -Syu \
    && xbps-install -y fastfetch \
    && xbps-remove -O \
    && rm -rf /var/cache/xbps/*

ENTRYPOINT ["fastfetch"]
