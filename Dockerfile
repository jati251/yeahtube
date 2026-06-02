# ── YeahTube Dockerfile (with nginx) ─────────────────
# nginx:5207 → Next.js:3000 — proper Host headers, no redirect bugs
#
# Usage:
#   docker build -t yeahtube:latest .
#   docker run -d --restart always --name yeahtube -p 5207:5207 yeahtube:latest

# ── Stage 1: Build Next.js ─────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ ffmpeg
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild sharp && npm cache clean --force

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 2: Production image with nginx ────────────────
FROM node:20-alpine

RUN apk add --no-cache nginx ffmpeg curl && \
    mkdir -p /run/nginx /app

WORKDIR /app

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./
# Copy .env file so the standalone server can load env vars like DATABASE_URL and JWT_SECRET
COPY --from=builder /app/.env ./

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 5207

# Start script: nginx + Next.js
RUN printf '#!/bin/sh\nnginx\nnode server.js' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
