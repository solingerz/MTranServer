FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY ui/package.json ui/bun.lock ./ui/
RUN cd ui && bun install --frozen-lockfile

COPY . .

RUN bun run build:server

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./

ENV MT_HOST=0.0.0.0 \
    MT_PORT=8989 \
    NODE_ENV=production

EXPOSE 8989

CMD ["node", "main.js"]
