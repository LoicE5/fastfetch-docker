FROM devuan/devuan:stable

RUN apt-get update \
    && apt-get install -y --no-install-recommends fastfetch \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

ENTRYPOINT ["fastfetch"]
