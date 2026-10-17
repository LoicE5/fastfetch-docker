FROM mageia:cauldron

RUN urpmi.update -a \
    && urpmi --auto --no-recommends fastfetch \
    && urpmi --clean \
    && rm -rf /var/cache/urpmi/*

ENTRYPOINT ["fastfetch"]
