FROM amazonlinux:2023
ARG TARGETARCH

RUN set -eu; \
    case "$TARGETARCH" in amd64) upstream_arch=amd64 ;; arm64) upstream_arch=aarch64 ;; *) exit 1 ;; esac; \
    dnf install -y --setopt=install_weak_deps=False ca-certificates curl-minimal; \
    curl --fail --show-error --location --retry 3 \
        "https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-${upstream_arch}-polyfilled.rpm" \
        --output /tmp/fastfetch.rpm; \
    dnf install -y --setopt=install_weak_deps=False /tmp/fastfetch.rpm; \
    rm -f /tmp/fastfetch.rpm; \
    dnf clean all; \
    rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
