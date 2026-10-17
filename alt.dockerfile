FROM alt:sisyphus

RUN apt-get update \
    && apt-get install -y fastfetch \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["fastfetch"]
