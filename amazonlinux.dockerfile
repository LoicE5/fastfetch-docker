FROM public.ecr.aws/amazonlinux/amazonlinux:2023-minimal
ARG TARGETARCH

# MicroDNF cannot install local RPM files; RPM keeps dependency checks enabled.
RUN set -eu; \
    case "$TARGETARCH" in amd64) upstream_arch=amd64 ;; arm64) upstream_arch=aarch64 ;; *) exit 1 ;; esac; \
    microdnf install -y --setopt=install_weak_deps=0 ca-certificates curl-minimal; \
    curl --fail --show-error --location --retry 3 \
        "https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-${upstream_arch}-polyfilled.rpm" \
        --output /tmp/fastfetch.rpm; \
    rpm --install /tmp/fastfetch.rpm; \
    rm -f /tmp/fastfetch.rpm; \
    microdnf clean all; \
    rm -rf /var/cache/dnf

ENTRYPOINT ["fastfetch"]
