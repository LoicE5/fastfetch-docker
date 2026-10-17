FROM photon:latest
ARG TARGETARCH

# Upstream release RPMs are unsigned; TDNF otherwise rejects the local package.
RUN set -eu; \
    case "$TARGETARCH" in amd64) upstream_arch=amd64 ;; arm64) upstream_arch=aarch64 ;; *) exit 1 ;; esac; \
    tdnf install -y ca-certificates curl; \
    curl --fail --show-error --location --retry 3 \
        "https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-${upstream_arch}-polyfilled.rpm" \
        --output /tmp/fastfetch.rpm; \
    tdnf install -y --nogpgcheck /tmp/fastfetch.rpm; \
    rm -f /tmp/fastfetch.rpm; \
    tdnf clean all; \
    rm -rf /var/cache/tdnf

ENTRYPOINT ["fastfetch"]
