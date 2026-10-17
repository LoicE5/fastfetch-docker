FROM opensuse/tumbleweed:latest

RUN zypper --non-interactive refresh \
    && zypper --non-interactive install --no-recommends fastfetch \
    && zypper clean --all

ENTRYPOINT ["fastfetch"]
