# ── YeahTube Dockerfile (nginx + Next.js + transcoder worker) ──
# nginx:5207 → Next.js:3000 — proper Host headers, no redirect bugs
#
# Usage:
#   docker build -t yeahtube:latest .
#   docker run -d --restart always --name yeahtube -p 5207:5207 --network jati_default yeahtube:latest

# ── Stage 1: Build Next.js ─────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ ffmpeg
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --ignore-scripts && npm rebuild sharp && npm cache clean --force

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 2: Production image with nginx + worker ──────
FROM node:20-alpine

RUN apk add --no-cache nginx ffmpeg curl supervisor && \
    mkdir -p /run/nginx /app /var/log/supervisor

WORKDIR /app

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./

# Copy db, lib, types, and tsconfig for worker and runtime helpers
COPY --from=builder /app/db ./db
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/worker.ts ./worker.ts
COPY --from=builder /app/node_modules ./node_modules

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisord config
COPY supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 5207

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
