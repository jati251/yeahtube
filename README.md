# YeahTube — High-Performance Personal Media Gallery & Video Streaming

YeahTube is a self-hosted, cloud-native media streaming and gallery platform built with Next.js 16, React 19, PostgreSQL (Drizzle ORM), Redis, MinIO/S3, and an asynchronous FFmpeg transcoding worker.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Browser)"]
        UI["Next.js 16 + React 19 UI"]
        SWR["SWR In-Memory Cache (0ms instant nav)"]
        HLS_PLAYER["Custom Video Player (Dynamic Hls.js)"]
    end

    subgraph AppServer ["Next.js Application Server"]
        SSR["Server-Side Rendering (RSC)"]
        API["API Route Handlers"]
        REDIS_CACHE["Redis Caching Layer (<5ms queries)"]
        DRIZZLE["Drizzle ORM (Prepared Statements)"]
    end

    subgraph StorageQueue ["Storage & Queue Infrastructure"]
        S3["S3 / MinIO Object Storage"]
        REDIS_QUEUE["BullMQ Transcode Queue"]
        POSTGRES[("PostgreSQL Database")]
    end

    subgraph BackgroundWorker ["Transcoding Worker"]
        WORKER["FFmpeg Transcoder (Node.js Worker)"]
    end

    UI --> SWR
    SWR --> SSR
    SWR --> API
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

1. **Client-Side SWR In-Memory Cache (`hooks/usePaginatedPosts.ts`)**:
   - Memorizes visited pages and filter combinations in memory.
   - Forward/Back and filter switching updates the UI **instantly (0ms)** without blocking spinners.
   - Silently performs background revalidation for stale data (> 30s).
2. **Server-Side Redis Cache (`lib/redis.ts` & `lib/cache.ts`)**:
   - `getFeedPosts`: Query results cached in Redis with normalized filter keys (TTL: 60s). Latency drops from ~150ms to **< 5ms**.
   - `getPostDetail`: Post metadata & recommendations cached in Redis (TTL: 120s) with dynamic per-user permission evaluation.
   - `tags` & `categories`: Cached in Redis (TTL: 10m).
3. **Smart Invalidation Pipeline**:
   - Mutations (uploads, edits, deletions, batch deletions, category updates) automatically purge affected Redis cache keys using non-blocking Redis `SCAN`.
4. **Code Splitting & Bundle Optimization**:
   - **Dynamic Hls.js**: `hls.js` (~200KB) is dynamically imported only when playing non-native HLS/MPEG-TS videos.
   - **Dynamic Modals**: `EditPostModal` and `ConfirmModal` are loaded via `next/dynamic` on demand.
   - **Turbopack Package Optimization**: `optimizePackageImports: ["lucide-react"]` eliminates tree-shaking overhead.
5. **Database Prepared Statements (`lib/queries/posts.ts`)**:
   - PostgreSQL execution plans are pre-compiled for hot single-item lookups (`get_category_by_slug`, `get_post_detail_by_id`).

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
│   │   ├── playlists/      # User playlists
│   │   ├── shorts/         # Reels / Shorts vertical feed
│   │   ├── trending/       # Trending media
│   │   ├── upload/         # Media upload interface
│   │   ├── view/[id]/      # Photo gallery viewer
│   │   ├── watch/[id]/     # Video player view
│   │   ├── FeedClient.tsx  # Feed client container & filtering UI
│   │   └── page.tsx        # Server-rendered home page
│   ├── api/                # API Route handlers (REST endpoints)
│   │   ├── auth/           # Login, logout, session
│   │   ├── categories/     # Category CRUD & invalidation
│   │   ├── media/          # Media streaming proxy
│   │   ├── posts/          # Feed queries, single post CRUD, batch delete
│   │   ├── search/         # Quick search autocomplete
│   │   └── upload/         # Chunked/direct file upload & validation
│   └── globals.css         # Tailwind CSS v4 design system
├── components/
│   ├── admin/              # Admin panels & category management
│   ├── filters/            # Filter sidebar, mobile filters, tag clouds
│   ├── interactions/       # Comments, like/dislike, playlist modal
│   ├── layout/             # Header, navigation, theme toggle
│   ├── media/              # MediaCard, MediaListItem, VideoPlayer, PhotoGallery
│   ├── providers/          # QueryProvider, ThemeProvider
│   └── ui/                 # Modals, Toast, PaginationControls, Button
├── db/
│   ├── schema.ts           # Drizzle PostgreSQL schema definition
│   ├── index.ts            # Database client pool
│   └── seed.ts             # Initial database seeder
├── hooks/
│   ├── useFeedFilters.ts   # URL sync & filter state management
│   ├── usePaginatedPosts.ts# SWR in-memory caching & pagination hook
│   └── usePostSelection.ts # Batch selection & bulk deletion hook
├── lib/
│   ├── cache.ts            # Redis cache helpers & domain invalidators
│   ├── redis.ts            # Singleton Redis connection client
│   ├── queries/posts.ts    # Optimized PostgreSQL queries & prepared statements
│   ├── storage.ts          # S3/MinIO client & presigned URL generator
│   └── transcode-queue.ts  # BullMQ transcode producer
├── worker.ts               # Background FFmpeg transcoding worker
└── next.config.ts          # Turbopack & Next.js production configuration
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

### 4. Run Transcoding Worker (Optional for video processing)
In a separate terminal, launch the background transcode worker:
```bash
npx tsx worker.ts
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

