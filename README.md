# YeahTube — High-Performance Personal Media Gallery & Video Streaming

YeahTube is a self-hosted, cloud-native media streaming and gallery platform built with Next.js 16, React 19, PostgreSQL (Drizzle ORM), Redis, MinIO/S3, and an asynchronous FFmpeg transcoding worker.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Browser)"]
        UI["Next.js 16 + React 19 UI"]
        QUERY["TanStack Query + Zustand Cache"]
        HLS_PLAYER["Custom Video Player (Dynamic Hls.js)"]
    end

    subgraph AppServer ["Next.js Application Server"]
        SSR["Server-Side Rendering (RSC + server-only)"]
        API["API Route Handlers"]
        REDIS_CACHE["Redis Caching Layer (<5ms queries)"]
        DRIZZLE["Drizzle ORM (PostgreSQL)"]
    end

    subgraph StorageQueue ["Storage & Queue Infrastructure"]
        S3["S3 / MinIO Object Storage"]
        REDIS_QUEUE["BullMQ Transcode Queue"]
        POSTGRES[("PostgreSQL Database")]
    end

    subgraph BackgroundWorker ["Transcoding Worker"]
        WORKER["FFmpeg Transcoder (Node.js Worker)"]
    end

    UI --> QUERY
    QUERY --> SSR
    QUERY --> API
    SSR --> REDIS_CACHE
    API --> REDIS_CACHE
    REDIS_CACHE --> DRIZZLE
    DRIZZLE --> POSTGRES
    API -->|Uploads| S3
    API -->|Enqueue Jobs| REDIS_QUEUE
    REDIS_QUEUE --> WORKER
    WORKER -->|Fetch Raw & Upload HLS/Thumbnails| S3
    WORKER -->|Update Media Status| POSTGRES
    HLS_PLAYER -->|Stream Presigned / Proxy| S3
```

---

## ⚡ Multi-Layer Caching & Performance Engine

1. **Client-Side Cache & SWR Navigation (`services/queries/` & `hooks/usePaginatedPosts.ts`)**:
   - TanStack React Query + Zustand stores active filters and page states in memory.
   - Forward/Back and tab switching updates UI instantly without unnecessary blocking spinners.
2. **Server-Side Redis Cache Layer (`lib/redis.ts` & `lib/cache.ts`)**:
   - `getFeedPosts`: Query results cached in Redis with normalized filter keys (TTL: 300s). Latency drops to **< 5ms**.
   - `getPostDetail`: Post metadata & recommendations cached in Redis (`cache:post:detail:*`, `cache:recommendations:*`).
   - `tags` & `categories`: Cached in Redis (`cache:tags:all`, `cache:categories:all`).
3. **Smart Cache Invalidation Pipeline**:
   - Mutations (uploads, edits, deletions, batch deletions, category updates) automatically purge affected Redis cache keys using non-blocking Redis `SCAN`.
4. **Code Splitting & Bundle Optimization**:
   - **Dynamic Hls.js**: `hls.js` is loaded on demand for streaming segments.
   - **Dynamic Modals**: Heavy modals like `EditPostModal` and `ConfirmModal` are loaded via `next/dynamic`.
   - **Modern Next.js 16 Config**: Built with Turbopack, package optimization for icon sets, and fast routing.
5. **Database Isolation & Performance (`lib/queries/`)**:
   - All server query modules use `server-only` to guarantee database logic is never bundled into client chunks.
   - Parallel batch resolving for playlist sample thumbnails (`resolvePlaylistSampleThumbnails`).

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions) |
| **Frontend** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Zustand](https://github.com/pmndrs/zustand), [@tanstack/react-query](https://tanstack.com/query), [@tanstack/react-virtual](https://tanstack.com/virtual), [Lucide React](https://lucide.dev/) |
| **Video & Media** | [Hls.js](https://github.com/video-dev/hls.js/), [Sharp](https://sharp.pixelplumbing.com/), [Fluent-FFmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [Drizzle ORM](https://orm.drizzle.team/), `drizzle-kit` |
| **Caching & Queues** | [Redis](https://redis.io/) (`ioredis`), [BullMQ](https://bullmq.io/) |
| **Storage** | S3-Compatible Object Storage ([MinIO](https://min.io/) / AWS S3) |
| **Security & Auth** | [Jose](https://github.com/panva/jose) (JWT sessions in HttpOnly cookies), CSRF Protection, Bcryptjs |

---

## 📁 Project Structure

```
yeahtube/
├── app/
│   ├── (auth)/             # Authentication routes (/login)
│   ├── (main)/             # Main application layout & pages
│   │   ├── admin/          # Admin management dashboard
│   │   ├── history/        # Watch history
│   │   ├── playlists/      # User & public playlists
│   │   ├── shorts/         # Reels / Shorts vertical feed
│   │   ├── trending/       # Trending media
│   │   ├── upload/         # Media upload interface
│   │   ├── user/[username] # Public user profile & showcase
│   │   ├── view/[id]/      # Photo gallery viewer
│   │   ├── watch/          # Video player route (?v=...)
│   │   └── page.tsx        # Server-rendered home page
│   ├── api/                # API Route handlers (REST endpoints)
│   └── globals.css         # Tailwind CSS v4 design system
├── components/
│   ├── admin/              # Admin panels & metrics
│   ├── feed/               # Feed header, display & bulk action bars
│   ├── filters/            # Filter sidebar, mobile filters, tag cloud
│   ├── interactions/       # Comments, like/dislike, save to playlist
│   ├── layout/             # Header, navigation, search bar, user drawer
│   ├── media/              # MediaCard, MediaListItem, VideoPlayer, ReelItem, PhotoGallery
│   ├── providers/          # QueryProvider, ThemeProvider
│   ├── ui/                 # Modals, Button, Toast, PaginationControls
│   └── upload/             # FileDropzone, UploadForm, MetadataFields
├── db/
│   ├── schema.ts           # Drizzle PostgreSQL schema definition
│   ├── index.ts            # Database client pool
│   └── seed.ts             # Initial database seeder
├── hooks/                  # Custom React hooks (feed, player, auth, upload)
├── lib/
│   ├── cache.ts            # Redis cache helpers & domain invalidators
│   ├── queries/            # Server-only PostgreSQL queries (posts, playlists, users)
│   ├── redis.ts            # Singleton Redis connection client
│   ├── storage.ts          # S3/MinIO client & presigned URL generator
│   └── transcode-queue.ts  # BullMQ transcode producer
├── services/queries/       # TanStack Query custom hooks & mutations
├── stores/                 # Zustand global application state
├── utils/                  # Shared formatting & duration utilities
├── worker.ts               # Background FFmpeg transcoding worker
└── proxy.ts                # Next.js 16 Edge Proxy & Auth Middleware
```

---

## ⚙️ Environment Variables

Create a `.env` or `.env.local` file in the root directory:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/yeahtube

# Cache & Queue (Redis)
REDIS_URL=redis://localhost:6379

# Storage (S3 / MinIO)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=yeahtube
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true

# Authentication
JWT_SECRET=generate-a-random-secret-here
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration & Seeding
Push the Drizzle schema to your PostgreSQL instance and seed initial data:
```bash
# Push schema to database
npx drizzle-kit push

# Seed initial admin user and default categories
npm run db:seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Transcoding Worker (Optional for background video transcoding)
In a separate terminal, launch the background transcode worker:
```bash
npm run worker
```

---

## 📦 Production Build & Deployment

### Build Next.js Application
```bash
npm run build
npm start
```

### Docker Deployment
The project is configured for standalone Docker execution:
```bash
docker build -t yeahtube:latest .
docker run -p 3000:3000 --env-file .env yeahtube:latest
```

---

## 📜 License
Private personal project. All rights reserved.
