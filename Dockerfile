# ── YeahTube Dockerfile ──────────────────────────────────
# Multi-stage build: install deps → build Next.js → lean production image
#
# Usage:
#   docker build -t yeahtube:latest .
#   docker run -d \
#     --restart always \
#     --name yeahtube \
#     -p 5207:80 \
#     --env-file .env \
#     yeahtube:latest
#
# Required env vars (pass via --env-file or -e):
#   JWT_SECRET, DATABASE_PATH, STORAGE_TYPE, S3_ENDPOINT,
#   S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY,
#   S3_FORCE_PATH_STYLE

# ── Stage 1: Install dependencies ────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache \
  libc6-compat \
  python3 \
  make \
  g++ \
  ffmpeg

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && \
  npm rebuild sharp && \
  npm cache clean --force

# ── Stage 2: Build application ───────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache \
  libc6-compat \
  python3 \
  make \
  g++ \
  ffmpeg

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && \
  npm rebuild sharp && \
  npm cache clean --force

COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Production runner ───────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache \
  ffmpeg \
  curl \
  tzdata

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

WORKDIR /app

# Disable telemetry in production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80

# Copy lib/storage.ts and db files for runtime use
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy the standalone Next.js output (includes server code)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create data directory for SQLite (must be writable)
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:80/api/auth/session || exit 1

CMD ["node", "server.js"]
