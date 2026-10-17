FROM cgr.dev/chainguard/wolfi-base:latest

RUN apk add --no-cache fastfetch

ENTRYPOINT ["fastfetch"]
