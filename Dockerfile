FROM oven/bun:1 AS builder
WORKDIR /app
ARG TARGETARCH

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY ui/package.json ui/bun.lock ./ui/
RUN cd ui && bun install --frozen-lockfile

COPY . .

RUN cd ui && bun run build \
    && cd /app \
    && bun run scripts/gen-ui-assets.ts \
    && bun run scripts/gen-swagger-assets.ts \
    && case "$TARGETARCH" in \
        amd64) BUN_TARGET="bun-linux-x64-musl" ;; \
        arm64) BUN_TARGET="bun-linux-arm64-musl" ;; \
        *) echo "Unsupported TARGETARCH: $TARGETARCH" && exit 1 ;; \
      esac \
    && bun build src/main.ts --compile --target="$BUN_TARGET" --outfile ./dist/mtranserver --minify

FROM alpine:3.22

WORKDIR /app

RUN apk add --no-cache ca-certificates netcat-openbsd libstdc++ libgcc

COPY --from=builder /app/dist/mtranserver /app/mtranserver

ENV MT_HOST=0.0.0.0 \
    MT_PORT=8989 \
    NODE_ENV=production

EXPOSE 8989

ENTRYPOINT ["/app/mtranserver"]
