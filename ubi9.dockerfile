FROM registry.access.redhat.com/ubi9/ubi-micro:latest AS seed

FROM almalinux:9 AS builder
COPY --from=seed / /rootfs/

# DNF uses the builder's explicitly selected AlmaLinux/EPEL repositories and keys.
# The seeded RHEL RPM database satisfies system-release without replacing it.
RUN dnf install -y epel-release \
    && mkdir -p /tmp/fastfetch-repos \
    && cp /etc/yum.repos.d/almalinux*.repo /etc/yum.repos.d/epel.repo /tmp/fastfetch-repos/ \
    && mkdir -p /rootfs/etc/pki/rpm-gpg \
    && cp /etc/pki/rpm-gpg/RPM-GPG-KEY-* /rootfs/etc/pki/rpm-gpg/ \
    && dnf --installroot=/rootfs --releasever=9 \
        --setopt=reposdir=/tmp/fastfetch-repos \
        --setopt=module_platform_id=platform:el9 \
        --setopt=install_weak_deps=False --setopt=tsflags=nodocs \
        --exclude=almalinux-release --exclude=almalinux-repos --exclude=epel-release \
        install -y fastfetch \
    && rm -rf /rootfs/var/cache/dnf /rootfs/var/log/* /tmp/fastfetch-repos \
    && test ! -e /rootfs/usr/bin/dnf \
    && test ! -e /rootfs/usr/bin/rpm \
    && test ! -e /rootfs/usr/bin/gcc \
    && grep -q '^ID="rhel"' /rootfs/etc/os-release

FROM registry.access.redhat.com/ubi9/ubi-micro:latest
COPY --from=builder /rootfs/ /

ENTRYPOINT ["fastfetch"]
