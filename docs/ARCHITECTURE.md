# YeahTube — System Architecture

> **Version:** 1.0.0
> **Last Updated:** 2026-06-02
> **Status:** Draft — Ready for Implementation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [Route Design](#4-route-design)
5. [Component Tree](#5-component-tree)
6. [Authentication & Access Control](#6-authentication--access-control)
7. [File Storage Strategy](#7-file-storage-strategy)
8. [Security Considerations](#8-security-considerations)
9. [Next.js 16 Breaking Changes Reference](#9-nextjs-16-breaking-changes-reference)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. System Overview

### 1.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    LOCAL NETWORK (192.168.1.x)                    │
│                                                                   │
│  ┌─────────────────────┐     ┌──────────────────────────────┐    │
│  │   Client Browser     │     │   Proxmox VM (192.168.1.206) │    │
│  │   (Desktop/Mobile)   │     │                              │    │
│  │                      │     │  ┌────────────────────────┐  │    │
│  │  ┌────────────────┐  │     │  │   NFS Export            │  │    │
│  │  │ React 19 SPA    │  │     │  │   /srv/yeahtube/media/  │  │    │
│  │  │ (App Router)    │  │     │  │                        │  │    │
│  │  └───────┬────────┘  │     │  │   media/               │  │    │
│  └──────────┼───────────┘     │  │   ├── originals/       │  │    │
│             │                  │  │   ├── thumbnails/      │  │    │
│             │ HTTPS (:3000)    │  │   └── transcoded/      │  │    │
│             ▼                  │  └────────────────────────┘  │    │
│  ┌─────────────────────┐     │                              │    │
│  │  Next.js 16 Server   │     │                              │    │
│  │  (Node.js)           │◄────┼── NFS Mount (read/write) ───┘    │
│  │                      │     │
│  │  ┌────────────────┐  │     │
│  │  │ App Router      │  │     │
│  │  │ (RSC + Client)  │  │     │
│  │  ├────────────────┤  │     │
│  │  │ Route Handlers  │  │     │
│  │  │ (API Routes)    │  │     │
│  │  ├────────────────┤  │     │
│  │  │ Server Actions  │  │     │
│  │  ├────────────────┤  │     │
│  │  │ Proxy (Auth)    │  │     │
│  │  └───────┬────────┘  │     │
│  │          │             │     │
│  │  ┌───────▼────────┐  │     │
│  │  │ SQLite DB       │  │     │
│  │  │ (better-sqlite3)│  │     │
│  │  │ /data/yeahtube. │  │     │
│  │  │ db              │  │     │
│  │  └────────────────┘  │     │
│  └─────────────────────┘     └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow — Upload

```
Browser                    Next.js Server                  Proxmox VM
  │                             │                              │
  │  POST /api/upload           │                              │
  │  (multipart/form-data)      │                              │
  │  ─────────────────────────► │                              │
  │                             │                              │
  │                             │  Validate file type/size     │
  │                             │  Generate unique filename    │
  │                             │                              │
  │                             │  Write to NFS mount ────────►│
  │                             │  (stream to disk)            │
  │                             │                              │
  │                             │  Generate thumbnail ────────►│
  │                             │  (sharp for images,          │
  │                             │   ffmpeg for videos)         │
  │                             │                              │
  │                             │  Insert DB record            │
  │                             │  (media + files + tags)      │
  │                             │                              │
  │  ◄─── 201 Created ──────── │                              │
  │  { id, urls, ... }         │                              │
```

### 1.3 Data Flow — Streaming/Viewing

```
Browser                    Next.js Server                  Proxmox VM
  │                             │                              │
  │  GET /watch/[id]            │                              │
  │  ─────────────────────────► │                              │
  │                             │                              │
  │                             │  Auth check (proxy.ts)       │
  │                             │  Fetch post metadata (DB)    │
  │                             │  Render RSC page +           │
  │                             │  client player               │
  │  ◄─── HTML/RSC ─────────── │                              │
  │                             │                              │
  │  GET /api/media/[id]/stream │                              │
  │  (Range: bytes=0-...)       │                              │
  │  ─────────────────────────► │                              │
  │                             │                              │
  │                             │  Read from NFS mount ──────► │
  │                             │  Stream with Range support   │
  │                             │                              │
  │  ◄─── 206 Partial Content ─ │                              │
  │  (video/photo chunk)        │                              │
```

---

## 2. Technology Stack

### 2.1 Core Framework

| Category  | Choice               | Version | Rationale                                         |
| --------- | -------------------- | ------- | ------------------------------------------------- |
| Framework | Next.js (App Router) | 16.2.7  | Already installed; full-stack React with RSC      |
| Runtime   | Node.js (Turbopack)  | 20.9+   | Required by Next.js 16; Turbopack is default      |
| Language  | TypeScript (strict)  | 5.x     | Already configured                                |
| CSS       | Tailwind CSS         | v4      | Already installed; `@import "tailwindcss"` syntax |

### 2.2 Database & ORM

**Decision: SQLite via `better-sqlite3`**

| Library          | Version | Purpose                                                                                  |
| ---------------- | ------- | ---------------------------------------------------------------------------------------- |
| `better-sqlite3` | ^11.0   | Synchronous SQLite bindings — fast, zero-config, perfect for single-instance self-hosted |
| `drizzle-orm`    | ^0.38   | Type-safe ORM with SQL-like syntax; lighter than Prisma, great SQLite support            |
| `drizzle-kit`    | ^0.30   | Migration generation and management                                                      |

**Why not PostgreSQL?** — For a personal, single-instance, local-network app, SQLite eliminates the need to run/maintain a separate database server. Better-sqlite3 is synchronous, meaning no connection pool issues and simpler code. WAL mode provides concurrent read/write support.

**Database file location:** `./data/yeahtube.db` (relative to project root; add `data/` to `.gitignore`)

### 2.3 Authentication

**Decision: Custom JWT-based auth (no next-auth dependency)**

| Library    | Version | Purpose                                               |
| ---------- | ------- | ----------------------------------------------------- |
| `jose`     | ^5.9    | JWT signing/verification (Edge-compatible, pure JS)   |
| `bcryptjs` | ^2.4    | Password hashing (pure JS, no native bindings issues) |

**Why not Auth.js (next-auth v5)?**

- Auth.js v5 is primarily designed for OAuth/OIDC providers; credentials-based auth is still supported but secondary
- For a whitelist-only personal app with simple username/password login, a custom solution is lighter and more transparent
- Eliminates an external dependency that may have compatibility issues with Next.js 16
- `jose` works in both Node.js runtime and Edge-compatible contexts (though proxy.ts runs on Node.js in v16)

### 2.4 Media Handling

| Library                      | Version | Purpose                                       |
| ---------------------------- | ------- | --------------------------------------------- |
| `sharp`                      | ^0.33   | Image thumbnail generation and optimization   |
| `fluent-ffmpeg`              | ^2.1    | Video thumbnail extraction (wraps ffmpeg CLI) |
| `@vidstack/react`            | ^1.12   | Accessible video player with custom controls  |
| `react-photo-album`          | ^2.6    | Responsive photo gallery grid                 |
| `yet-another-react-lightbox` | ^3.21   | Fullscreen photo lightbox with zoom/pan       |

**Note:** `ffmpeg` must be installed on the host system (`brew install ffmpeg` on macOS; `apt install ffmpeg` on Linux).

### 2.5 File Upload & Forms

| Library               | Version | Purpose                                                 |
| --------------------- | ------- | ------------------------------------------------------- |
| `react-hook-form`     | ^7.54   | Form state management                                   |
| `@hookform/resolvers` | ^3.9    | Zod schema resolver for react-hook-form                 |
| `zod`                 | ^3.24   | Schema validation (frontend + backend)                  |
| `zod-form-data`       | ^2.0    | Zod helpers for `FormData` validation in route handlers |
| `uuid`                | ^10.0   | Unique filename generation                              |

### 2.6 UI Utilities

| Library          | Version | Purpose                                     |
| ---------------- | ------- | ------------------------------------------- |
| `clsx`           | ^2.1    | Conditional className merging               |
| `tailwind-merge` | ^2.6    | Merge Tailwind classes without conflicts    |
| `lucide-react`   | ^0.468  | Icon library (MIT licensed, tree-shakeable) |

### 2.7 Development

| Tool      | Purpose                                    |
| --------- | ------------------------------------------ |
| ESLint v9 | Already configured with flat config        |
| Prettier  | Optional — code formatting                 |
| `tsx`     | Running TypeScript scripts (seed DB, etc.) |

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  users   │       │    posts     │       │   tags   │
├──────────┤       ├──────────────┤       ├──────────┤
│ id (PK)  │──┐    │ id (PK)      │    ┌──│ id (PK)  │
│ username │  │    │ title        │    │  │ name     │
│ password │  │    │ description  │    │  │ slug     │
│ is_whitelisted│  │ user_id (FK) │◄───┘  └────┬─────┘
│ is_admin │  │    │ created_at   │            │
│ created_at│  │   │ updated_at   │    ┌───────┴───────┐
└──────────┘  │   └──────┬───────┘    │ post_tags (JT) │
              │          │            ├────────────────┤
              └──────────┘            │ post_id (FK)   │
                       │             │ tag_id (FK)    │
                       │             └────────────────┘
              ┌────────▼────────┐
              │   media_files   │
              ├─────────────────┤
              │ id (PK)         │
              │ post_id (FK)    │
              │ filename        │
              │ original_name   │
              │ mime_type       │
              │ media_type      │ (image | video)
              │ file_size_bytes │
              │ width           │ (nullable)
              │ height          │ (nullable)
              │ duration_secs   │ (nullable, video)
              │ thumbnail_path  │
              │ storage_path    │
              │ sort_order      │
              │ created_at      │
              └─────────────────┘
```

### 3.2 Drizzle Schema (Conceptual)

```typescript
// db/schema.ts

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isWhitelisted: integer("is_whitelisted", { mode: "boolean" })
    .notNull()
    .default(false),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Posts (a "post" = a media collection with title/desc/tags) ─

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Media Files (individual files within a post) ──────

export const mediaFiles = sqliteTable("media_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(), // UUID-based stored name
  originalName: text("original_name").notNull(), // Original upload name
  mimeType: text("mime_type").notNull(),
  mediaType: text("media_type", { enum: ["image", "video"] }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  width: integer("width"), // nullable for videos
  height: integer("height"), // nullable for videos
  durationSecs: real("duration_secs"), // only for videos
  thumbnailPath: text("thumbnail_path"), // relative path to thumbnail
  storagePath: text("storage_path").notNull(), // relative path to original
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Tags ──────────────────────────────────────────────

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(), // URL-safe version
});

// ── Post-Tags Junction ───────────────────────────────

export const postTags = sqliteTable("post_tags", {
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});
```

### 3.3 Indexes

```sql
-- Fast lookup by username for login
CREATE INDEX idx_users_username ON users(username);

-- Fast feed queries (most recent first)
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Filter posts by user
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Find all files for a post
CREATE INDEX idx_media_files_post_id ON media_files(post_id);

-- Filter by media type
CREATE INDEX idx_media_files_type ON media_files(media_type);

-- Tag lookup by slug
CREATE INDEX idx_tags_slug ON tags(slug);

-- Find all posts for a tag
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
```

### 3.4 SQLite WAL Mode

Enable WAL mode at startup for concurrent read performance:

```typescript
// db/index.ts
import Database from "better-sqlite3";

const db = new Database("./data/yeahtube.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
```

---

## 4. Route Design

### 4.1 Page Routes (App Router)

```
app/
├── layout.tsx                    # Root layout: <html>, body, providers
├── page.tsx                      # / — Home/feed with tag filters
├── loading.tsx                   # Feed loading skeleton
├── error.tsx                     # Feed error boundary
│
├── login/
│   └── page.tsx                  # /login — Login form
│
├── upload/
│   └── page.tsx                  # /upload — Multi-file upload page
│
├── watch/
│   └── [id]/
│       ├── page.tsx              # /watch/[id] — Video viewer (RSC + client player)
│       └── loading.tsx           # Video loading skeleton
│
├── view/
│   └── [id]/
│       ├── page.tsx              # /view/[id] — Photo gallery viewer
│       └── loading.tsx           # Gallery loading skeleton
│
├── browse/
│   └── page.tsx                  # /browse — Grid browse with filters
│
├── settings/
│   └── page.tsx                  # /settings — User settings (password change)
│
└── admin/
    └── page.tsx                  # /admin — User whitelist management (admin only)
```

### 4.2 API Route Handlers

```
app/api/
├── auth/
│   ├── login/
│   │   └── route.ts              # POST — Authenticate, set session cookie
│   ├── logout/
│   │   └── route.ts              # POST — Clear session cookie
│   └── session/
│       └── route.ts              # GET — Return current session info
│
├── posts/
│   ├── route.ts                  # GET — List posts (paginated, filterable)
│   │                             # POST — Create new post (title, desc, tags)
│   └── [id]/
│       ├── route.ts              # GET — Single post with media files
│       │                         # PATCH — Update post metadata/tags
│       │                         # DELETE — Delete post and all media files
│       └── media/
│           └── route.ts          # POST — Add media files to existing post
│
├── media/
│   └── [fileId]/
│       ├── thumbnail/
│       │   └── route.ts          # GET — Serve thumbnail image
│       └── stream/
│           └── route.ts          # GET — Stream original file (Range support)
│
├── upload/
│   └── route.ts                  # POST — Multipart upload (creates post + files)
│
├── tags/
│   ├── route.ts                  # GET — List all tags
│   └── [slug]/
│       └── route.ts              # GET — Posts by tag (paginated)
│
└── admin/
    └── users/
        ├── route.ts              # GET — List users (admin)
        └── [id]/
            └── route.ts          # PATCH — Toggle whitelist/admin (admin)
```

### 4.3 Proxy (Auth Gate)

```
proxy.ts                          # Root-level proxy file
                                  # Checks session cookie for all non-public routes
                                  # Redirects to /login if unauthenticated
                                  # Injects user info into request headers
```

### 4.4 Route Segment Config

All API routes and dynamic pages should use:

```typescript
export const dynamic = "force-dynamic"; // Don't statically cache
```

Since this is a private app behind auth, static generation provides no benefit. All pages are server-rendered with fresh data.

---

## 5. Component Tree

### 5.1 High-Level Layout

```
<RootLayout>
  <AuthProvider>          ← Client context: provides session state
    <Header>              ← Sticky top bar
      <Logo />
      <SearchBar />       ← Optional: text search
      <UploadButton />    ← "Create" button → navigates to /upload
      <UserMenu />        ← Avatar dropdown: Settings, Logout
    </Header>

    <div className="flex">
      <Sidebar>           ← Collapsible on mobile
        <TagFilterList /> ← List of tags with checkboxes/counts
      </Sidebar>

      <main>
        {children}        ← Page content (feed, watch, browse, etc.)
      </main>
    </div>
  </AuthProvider>
</RootLayout>
```

### 5.2 Page-Specific Components

#### Home Feed (`/`)

```
<FeedPage>
  <FeedControls>
    <TagFilterChips />     ← Horizontal scrollable tag chips
    <SortDropdown />       ← Newest / Oldest
  </FeedControls>
  <MediaGrid>
    <MediaCard />          ← Thumbnail + title + tags (repeated)
  </MediaGrid>
  <LoadMoreButton />       ← Cursor-based pagination
</FeedPage>
```

#### Media Card (used in Feed, Browse)

```
<MediaCard>
  <ThumbnailContainer>
    <img /> | <video poster />  ← Lazy loaded
    <MediaTypeBadge />          ← "Video" / "Image" / "Mixed"
    <DurationBadge />           ← Only for videos
  </ThumbnailContainer>
  <CardInfo>
    <Title />
    <TagList />                 ← Inline tag pills
    <Timestamp />               ← "3 days ago"
  </CardInfo>
</MediaCard>
```

#### Video Viewer (`/watch/[id]`)

```
<WatchPage>
  <VideoPlayerContainer>
    <VidstackPlayer>           ← @vidstack/react
      <MediaProvider />
      <Poster />               ← Thumbnail as poster
      <CustomControls>
        <PlayButton />
        <SeekSlider />
        <TimeDisplay />
        <VolumeSlider />
        <FullscreenButton />
      </CustomControls>
    </VidstackPlayer>
  </VideoPlayerContainer>

  <PostMetadata>
    <Title />
    <Description />
    <TagList />
    <DatePosted />
  </PostMetadata>

  <MediaGallery>               ← If post has multiple files
    <MediaThumbnail />         ← Click to switch current media
  </MediaGallery>
</WatchPage>
```

#### Photo Gallery Viewer (`/view/[id]`)

```
<ViewPage>
  <PhotoAlbum>                ← react-photo-album
    <Photo />                 ← Click to open lightbox
  </PhotoAlbum>

  <Lightbox>                  ← yet-another-react-lightbox
    <ZoomControls />
    <NavigationArrows />
    <Caption />
  </Lightbox>

  <PostMetadata>
    <Title />
    <Description />
    <TagList />
  </PostMetadata>
</ViewPage>
```

#### Upload Page (`/upload`)

```
<UploadPage>
  <UploadZone>                ← Drag & drop area
    <DropIndicator />
    <FileInput />             ← Hidden <input type="file" multiple>
    <UploadIcon />
    <UploadText />
  </UploadZone>

  <FilePreviewList>           ← After files selected
    <FilePreviewCard>
      <Thumbnail />
      <FileName />
      <FileSize />
      <RemoveButton />
    </FilePreviewCard>
  </FilePreviewList>

  <PostMetadataForm>          ← react-hook-form + zod
    <TitleInput />
    <DescriptionTextarea />
    <TagSelector>             ← Multi-select / autocomplete existing tags
      <TagChip />
      <CreateTagInput />
    </TagSelector>
    <SubmitButton />          ← "Publish" with upload progress
  </PostMetadataForm>

  <UploadProgressOverlay>     ← Shows during upload
    <ProgressBar />
    <StatusText />
  </UploadProgressOverlay>
</UploadPage>
```

#### Browse Page (`/browse`)

```
<BrowsePage>
  <BrowseControls>
    <MediaTypeFilter />       ← All / Images / Videos
    <TagFilterPanel>          ← Checkbox list of all tags
      <TagCheckbox />
    </TagFilterPanel>
    <SortDropdown />
  </BrowseControls>

  <MediaGrid>                 ← Same MediaCard component
    <MediaCard />
  </MediaGrid>

  <Pagination />
</BrowsePage>
```

### 5.3 Shared/Reusable Components

| Component         | Location             | Description                                  |
| ----------------- | -------------------- | -------------------------------------------- |
| `MediaCard`       | `components/media/`  | Card with thumbnail, title, tags, type badge |
| `MediaGrid`       | `components/media/`  | CSS Grid layout for MediaCards               |
| `TagChip`         | `components/tags/`   | Clickable tag pill                           |
| `TagSelector`     | `components/tags/`   | Multi-select tag input with autocomplete     |
| `ThumbnailImage`  | `components/media/`  | Optimized `<img>` with blur placeholder      |
| `VideoPlayer`     | `components/media/`  | Vidstack wrapper with custom controls        |
| `PhotoGallery`    | `components/media/`  | React Photo Album wrapper                    |
| `LightboxViewer`  | `components/media/`  | Yet Another React Lightbox wrapper           |
| `UploadZone`      | `components/upload/` | Drag & drop file upload area                 |
| `UploadProgress`  | `components/upload/` | Progress bar with status                     |
| `EmptyState`      | `components/ui/`     | Empty state with icon and message            |
| `LoadingSkeleton` | `components/ui/`     | Skeleton loader for cards/grids              |
| `ErrorBoundary`   | `components/ui/`     | Error display with retry button              |
| `ConfirmDialog`   | `components/ui/`     | Confirmation modal for deletes               |

---

## 6. Authentication & Access Control

### 6.1 Whitelist Strategy

**Approach: Database-backed whitelist with admin UI**

- `users` table has `is_whitelisted` boolean column
- Only users with `is_whitelisted = true` can log in
- Admin users (`is_admin = true`) can manage the whitelist via `/admin`
- An initial admin user is created via a seed script

**Seed script** (`scripts/seed.ts`):

```typescript
// Creates the initial admin user if none exists
// Run: npx tsx scripts/seed.ts
// Uses bcryptjs to hash the password
```

The initial admin credentials are set via environment variables:

```
# .env.local
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=change-me-immediately
```

### 6.2 Auth Flow

```
1. User visits any page
2. proxy.ts checks for "session" cookie
3. If NO valid session → redirect to /login
4. User submits login form (POST /api/auth/login)
5. Server verifies:
   a. User exists in DB
   b. User.is_whitelisted === true
   c. Password hash matches (bcryptjs.compare)
6. If valid → create JWT (jose), set as httpOnly secure cookie
7. Redirect to /
8. On subsequent requests, proxy.ts:
   a. Reads session cookie
   b. Verifies JWT signature + expiry
   c. If valid → attach user info to request headers → proceed
   d. If invalid/expired → redirect to /login
```

### 6.3 JWT Structure

```typescript
interface SessionPayload {
  sub: number; // user.id
  username: string;
  isAdmin: boolean;
  iat: number; // issued at
  exp: number; // expiry (7 days)
}
```

### 6.4 Session Cookie Configuration

```typescript
// Set on login
const sessionCookie = {
  name: "yeahtube_session",
  value: jwt, // JWT string
  httpOnly: true,
  secure: false, // false for local network (no HTTPS)
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days
};
```

### 6.5 Proxy (Auth Gate) — `proxy.ts`

```typescript
// proxy.ts — Located at project root
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Matcher: run on all routes except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get("yeahtube_session");
  if (!sessionCookie) {
    return redirectToLogin(request);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(sessionCookie.value, secret);

    // Attach user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload.sub));
    requestHeaders.set("x-user-name", payload.username as string);
    requestHeaders.set("x-user-admin", String(payload.isAdmin));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    // JWT invalid or expired
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
```

### 6.6 Server-Side Auth Helpers

```typescript
// lib/auth.ts
import { headers } from "next/headers";

export async function getCurrentUser() {
  const headersList = await headers();
  return {
    id: Number(headersList.get("x-user-id")),
    username: headersList.get("x-user-name")!,
    isAdmin: headersList.get("x-user-admin") === "true",
  };
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}
```

---

## 7. File Storage Strategy

### 7.1 Storage Architecture

**Primary Approach: MinIO S3-Compatible Object Storage (via Docker on Proxmox VM)**

The Proxmox VM at `192.168.1.206` runs a MinIO container that provides S3-compatible object storage. The Next.js server interacts with MinIO via the AWS S3 SDK over HTTP — **no filesystem mounts required**.

**Why MinIO over NFS/SMB:**

- MinIO was already running on the VM (serving other apps: `kost-images`, `post-images`, `ppid-assets`, etc.)
- HTTP API access eliminates mount complexity, permission issues, and NFS quirks on macOS
- Built-in S3 features: presigned URLs, bucket policies, IAM users, multipart uploads
- Persistent storage via Docker volume `jati_minio-data`
- Same single-binary deployment model as the rest of the stack

**VM Setup (on 192.168.1.206):**

The MinIO container was already running. The following resources were created for YeahTube:

```
MinIO Server:    http://192.168.1.206:9000  (API)
MinIO Console:   http://192.168.1.206:9005  (Web UI)
Root User:       minioadmin / minioadmin     (admin only — not used by app)
```

```bash
# Create bucket (via mc inside the MinIO container)
docker exec minio mc mb local/yeahtube

# Create dedicated app user
docker exec minio mc admin user add local yeahtube-app yeahtube-storage-secret-2026

# Create and attach IAM policy (CRUD on yeahtube bucket only)
docker exec minio mc admin policy create local yeahtube-policy /tmp/yeahtube-policy.json
docker exec minio mc admin policy attach local yeahtube-policy --user yeahtube-app
```

**Bucket Policy (IAM):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": ["arn:aws:s3:::yeahtube", "arn:aws:s3:::yeahtube/*"]
    }
  ]
}
```

**Next.js Server Setup:**

No mount needed. The app uses `@aws-sdk/client-s3` with environment variables pointing to the MinIO endpoint:

```bash
# .env.local
S3_ENDPOINT=http://192.168.1.206:9000
S3_REGION=us-east-1
S3_BUCKET=yeahtube
S3_ACCESS_KEY=yeahtube-app
S3_SECRET_KEY=yeahtube-storage-secret-2026
S3_FORCE_PATH_STYLE=true
```

The `STORAGE_ROOT` environment variable from the NFS plan is **not used**. Instead, all storage paths are S3 object keys managed by [`lib/storage.ts`](../../lib/storage.ts).

**Fallback: Local filesystem storage**

If MinIO is unreachable, the app can fall back to local filesystem storage at `./data/media/`:

```bash
STORAGE_TYPE=local
STORAGE_ROOT=./data/media
```

The `lib/storage.ts` module abstracts the storage backend, so switching between S3 and local is a config change.

### 7.2 Bucket Object Key Structure

Files are stored as S3 objects in the `yeahtube` bucket. Object keys use prefixes to organize content:

```
s3://yeahtube/
├── uploads/
│   ├── videos/{year}/{month}/{uuid}.{ext}     # Raw uploaded videos
│   └── images/{year}/{month}/{uuid}.{ext}     # Raw uploaded images
├── thumbnails/{year}/{month}/{uuid}_thumb.webp # 400px WebP thumbnails
└── processed/{year}/{month}/{uuid}_720p.mp4    # Future: transcoded variants
```

These key prefixes map to the [`StoragePaths`](../../lib/storage.ts:37) helper in [`lib/storage.ts`](../../lib/storage.ts).

File naming: UUID v4 to prevent enumeration and name collisions.

### 7.3 Upload Flow (Detailed)

```
1. Client selects files (input[multiple] or drag-drop)
2. Client-side validation:
   - File type whitelist check (by extension + magic bytes check via
     File.type)
   - File size check (< MAX_UPLOAD_SIZE)
3. User fills in post metadata (title, description, tags)
4. User clicks "Publish"
5. POST /api/upload with FormData:
   - files: File[] (the media files)
   - title: string
   - description: string
   - tags: string (JSON array of tag names)
6. Server Route Handler:
   a. Validate session (read cookie, verify JWT)
   b. Validate FormData with zod-form-data
   c. Create post record in DB
   d. For each file:
      - Validate MIME type via file-type (magic bytes)
      - Generate UUID filename
      - Determine media_type (image/video)
      - Write to STORAGE_ROOT/originals/{year}/{month}/{uuid}.{ext}
        using streaming write (fs.createWriteStream)
      - For images: generate thumbnail with sharp
        → STORAGE_ROOT/thumbnails/{year}/{month}/{uuid}_thumb.webp
        → Extract dimensions with sharp
      - For videos: extract thumbnail with fluent-ffmpeg
        → Take screenshot at 10% duration
        → Save as STORAGE_ROOT/thumbnails/{year}/{month}/{uuid}_thumb.webp
        → Extract duration with ffprobe
      - Insert media_file record in DB
   e. Associate tags (find or create, then insert into post_tags)
   f. Return created post with all media file records
```

### 7.4 Streaming/Viewing Flow

**Video Streaming:**

```
Client requests: GET /api/media/{fileId}/stream
  with Range header: bytes=0-1048575

Server:
  1. Look up media_file record by fileId
  2. Verify the linked post exists (and user has access - all whitelist
     users can view all posts)
  3. Get file path: STORAGE_ROOT/originals/{path}
  4. Stat file to get size
  5. Parse Range header
  6. Create read stream with { start, end }
  7. Return Response with:
     - Status: 206 Partial Content
     - Headers:
       Content-Type: {mime_type}
       Content-Range: bytes {start}-{end}/{total}
       Content-Length: {chunk_size}
       Accept-Ranges: bytes
       Cache-Control: private, max-age=3600
```

**Image/Thumbnail Serving:**

```
Client requests: GET /api/media/{fileId}/thumbnail

Server:
  1. Look up media_file record
  2. Read thumbnail from STORAGE_ROOT/thumbnails/{path}
  3. Return with:
     - Content-Type: image/webp
     - Cache-Control: private, max-age=86400
```

### 7.5 Thumbnail Generation

**Images (`sharp`):**

```typescript
import sharp from "sharp";

async function generateImageThumbnail(
  inputPath: string,
  outputPath: string,
): Promise<{ width: number; height: number }> {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  await image
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);

  return { width: metadata.width!, height: metadata.height! };
}
```

**Videos (`fluent-ffmpeg`):**

```typescript
import ffmpeg from "fluent-ffmpeg";

async function generateVideoThumbnail(
  inputPath: string,
  outputPath: string,
): Promise<{ durationSecs: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);

      const durationSecs = metadata.format.duration!;

      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          folder: path.dirname(outputPath),
          filename: path.basename(outputPath),
          timemarks: [Math.min(durationSecs * 0.1, 10)], // 10% or 10s
          size: "400x?",
        })
        .on("end", () => resolve({ durationSecs }))
        .on("error", reject);
    });
  });
}
```

### 7.6 Video Transcoding

**For the initial version: NO transcoding.** Rely on browser native codec support.

Modern browsers support H.264 (MP4) and VP9 (WebM) natively. Since this is a personal project where the uploader controls the source, videos can be uploaded in browser-compatible formats directly.

**Future enhancement:** If transcoding becomes necessary (e.g., mobile compatibility, smaller file sizes), integrate `ffmpeg` for server-side transcoding to H.264/AAC MP4. This would add significant processing overhead and should be a background job.

### 7.7 Upload Size Limits

Configured in [`next.config.ts`](next.config.ts:1):

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // Increase body size limit for file uploads
  // Note: This is the body parser limit for API routes
  experimental: {
    // serverActions body size limit (default 1MB)
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};
```

For the upload route handler, use streaming to avoid loading entire files into memory:

```typescript
// In upload route handler:
// Don't await request.formData() — it buffers everything
// Instead, parse the multipart stream manually, or use request.formData()
// with the bodySizeLimit configured above
```

---

## 8. Security Considerations

### 8.1 Authentication & Session

| Concern           | Mitigation                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Password storage  | bcryptjs with 12 salt rounds                                                                        |
| Session hijacking | httpOnly cookies, SameSite=Lax                                                                      |
| JWT secret        | 256-bit random string in `.env.local`, not committed                                                |
| Brute force login | Rate limiting on `/api/auth/login` (simple in-memory counter per IP, or 5-attempt lockout per user) |
| Session expiry    | JWT expires after 7 days; proxy checks `exp` claim                                                  |

### 8.2 File Upload Security

| Concern              | Mitigation                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Malicious file types | Validate MIME type server-side using `file-type` (magic bytes, not just extension). Whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`, `video/mp4`, `video/webm`, `video/quicktime` |
| File size abuse      | Max 500MB per file. Enforced server-side before writing to disk                                                                                                                                                 |
| Path traversal       | Use UUID filenames only — never trust `originalName` for storage path                                                                                                                                           |
| Executable uploads   | Files stored outside web root; served through API with `Content-Type` headers. Never make storage dir directly accessible                                                                                       |
| Zip bombs            | Not applicable — archive files are not in the allowed MIME list                                                                                                                                                 |
| XSS in filenames     | Never render `originalName` without sanitization; React handles this by default                                                                                                                                 |

### 8.3 CSRF Protection

- Next.js Server Actions include built-in CSRF protection via the `Next-Action` header
- For API routes, the `SameSite=Lax` cookie policy prevents cross-site form submissions
- The proxy (`proxy.ts`) can add an `Origin`/`Referer` check for mutation endpoints

### 8.4 HTTP Security Headers

Configure in [`next.config.ts`](next.config.ts:1):

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // Next.js requires unsafe-inline for dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "media-src 'self' blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 8.5 Input Sanitization

| Input            | Approach                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| Post title       | Zod: `z.string().min(1).max(200).trim()`                                    |
| Post description | Zod: `z.string().max(5000).trim()`                                          |
| Tag names        | Zod: `z.string().min(1).max(50).trim().toLowerCase().regex(/^[a-z0-9-]+$/)` |
| Username         | Zod: `z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/)`                   |
| Password         | Zod: `z.string().min(8).max(128)`                                           |

### 8.6 Database Security

- SQLite file stored in `./data/` (added to `.gitignore`)
- Drizzle ORM uses parameterized queries — no SQL injection risk
- Database file permissions: `600` (owner read/write only)

### 8.7 Environment Variables

```bash
# .env.local (NEVER committed)
JWT_SECRET=                    # openssl rand -base64 32
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=        # Set a strong initial password
STORAGE_ROOT=/mnt/yeahtube-media
DATABASE_PATH=./data/yeahtube.db
```

### 8.8 Network Security

Since this is a local-network-only app:

- The Next.js dev server binds to `0.0.0.0` by default — accessible by any device on the local network. This is acceptable for a private home network.
- For production: use `next start` behind a reverse proxy (nginx/Caddy) with HTTPS (self-signed cert) if desired
- The Proxmox VM is only accessible within the local network (192.168.1.x)
- NFS export is restricted to the local subnet (`192.168.1.0/24`)

---

## 9. Next.js 16 Breaking Changes Reference

Key differences from Next.js 14/15 that affect this project:

### 9.1 Middleware → Proxy

- File renamed from [`middleware.ts`] to [`proxy.ts`](proxy.ts) (at project root)
- Export function renamed from `middleware` to `proxy`
- Configuration flags renamed: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`
- Runtime defaults to **Node.js** (not Edge)

### 9.2 Async Request APIs (CRITICAL)

All of these are now **fully async** (synchronous access removed):

```typescript
// ✅ CORRECT (Next.js 16)
const headersList = await headers();
const cookieStore = await cookies();
const { slug } = await params;
const search = await searchParams;

// ❌ WRONG — will throw in Next.js 16
const headersList = headers();
```

### 9.3 Route Handler Context

```typescript
// ✅ CORRECT — params is a Promise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
}
```

Use the `RouteContext` helper for type-safe params:

```typescript
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/posts/[id]">,
) {
  const { id } = await ctx.params;
}
```

### 9.4 Turbopack

- Default for both `next dev` and `next build`
- `turbopack` config is now top-level (not under `experimental`)
- No `--turbopack` flag needed

### 9.5 `revalidateTag` API Change

```typescript
// ✅ CORRECT — requires cacheLife profile as second arg
revalidateTag("posts", "max");
```

### 9.6 `next/image` Changes

- `images.dangerouslyAllowLocalIP: true` required for local network images
- `images.domains` is deprecated — use `images.remotePatterns`

### 9.7 ESLint

- `next lint` command removed — use ESLint CLI directly
- ESLint v9 flat config format (already configured in scaffold)

### 9.8 React 19.2

- Ref handling: callback refs now require cleanup return
- Context: `useContext` no longer skips context when `memo` is used
- New APIs available: `useEffectEvent`, `Activity`, `ViewTransition`

---

## 10. Implementation Phases

### Phase 1: Foundation

1. Set up SQLite database with Drizzle ORM (`drizzle-orm` + `drizzle-kit`)
2. Implement `/lib/db.ts` — database connection singleton with WAL mode
3. Create database schema and run initial migration
4. Implement JWT auth utilities (`/lib/auth.ts`)
5. Create [`proxy.ts`](proxy.ts) — auth gate for all routes
6. Build `/login` page with login form
7. Create seed script for initial admin user
8. Configure Tailwind v4 theme and base styles

### Phase 2: Upload Pipeline

1. Implement `/api/upload` route handler (multipart, validation, thumbnail generation)
2. Build `/upload` page with drag-and-drop zone
3. Build upload metadata form (title, description, tags)
4. Implement thumbnail generation (sharp for images, ffmpeg for videos)
5. Implement file type validation with magic bytes

### Phase 3: Media Viewing

1. Implement `/api/media/[fileId]/stream` — Range-request video streaming
2. Implement `/api/media/[fileId]/thumbnail` — thumbnail serving
3. Build `/watch/[id]` — video viewer page with Vidstack player
4. Build `/view/[id]` — photo gallery with lightbox
5. Build `MediaCard` component for feed/grid display

### Phase 4: Feed & Browse

1. Implement `/api/posts` — paginated post listing with filters
2. Build `/` — Home feed page with media grid
3. Build `/browse` — full browse page with filters
4. Implement tag system (`/api/tags`, tag filtering)

### Phase 5: Polish

1. Mobile responsive design pass
2. Lazy loading and performance optimization
3. Admin page (`/admin`) — user whitelist management
4. Settings page (`/settings`) — password change
5. Error boundaries and loading states throughout
6. Delete post functionality with confirmation dialog

---

## Appendix A: Package Installation Commands

```bash
# Database
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3

# Auth
npm install jose bcryptjs
npm install -D @types/bcryptjs

# Media processing
npm install sharp fluent-ffmpeg
npm install -D @types/fluent-ffmpeg

# Media UI
npm install @vidstack/react react-photo-album yet-another-react-lightbox

# Forms & validation
npm install react-hook-form @hookform/resolvers zod zod-form-data

# UI utilities
npm install clsx tailwind-merge lucide-react uuid

# Dev tools
npm install -D tsx
```

## Appendix B: Environment Variables Checklist

```bash
# .env.local
JWT_SECRET=<generated>                          # openssl rand -base64 32
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=<generated>

# Storage — MinIO S3-compatible (primary)
STORAGE_TYPE=s3
S3_ENDPOINT=http://192.168.1.206:9000
S3_REGION=us-east-1
S3_BUCKET=yeahtube
S3_ACCESS_KEY=yeahtube-app
S3_SECRET_KEY=yeahtube-storage-secret-2026
S3_FORCE_PATH_STYLE=true

# Storage — Local filesystem (fallback)
# STORAGE_TYPE=local
# STORAGE_ROOT=./data/media

DATABASE_PATH=./data/yeahtube.db
```

## Appendix C: `.gitignore` Additions

```gitignore
# Database
/data/

# Uploaded media (if using local storage fallback)
/mnt/

# Environment (already covered by .env*)
```

---

_End of Architecture Document_
