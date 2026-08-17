# Gemini / Antigravity Agent Guidelines — Yeahtube

Panduan arsitektur, konvensi, dan aturan penting untuk AI agents (Gemini / Antigravity) saat mengembangkan dan me-maintain codebase **Yeahtube**.

---

## 1. Arsitektur & Modern Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack, Dynamic Rendering dengan `server-only`).
- **Database & ORM**: PostgreSQL + Drizzle ORM (`db/schema.ts`).
- **State Management & Data Fetching**: TanStack React Query (`services/queries/`) + Zustand (`stores/appStore.ts`).
- **HTTP Client**: Custom fetch wrapper (`lib/api-client.ts`).
- **Auth & Session**: Custom JWT session cookie (`yeahtube_session`) via `jose` + Next.js 16 Proxy Middleware (`proxy.ts`).
- **Storage & Media**: AWS S3 compatible object storage (MinIO / AWS S3) dengan Sharp image processing & FFmpeg background worker.
- **Cache & Queue**: Redis (`ioredis` via `lib/cache.ts`) + BullMQ (`lib/transcode-queue.ts`).

---

## 2. Aturan Krusial Autentikasi & Proxy (`proxy.ts` & `lib/api-client.ts`)

> [!CAUTION]
> **Global 401 Interceptor**: `lib/api-client.ts` memiliki interceptor client-side yang langsung me-redirect browser (`window.location.href = /login`) saat menerima status **`401 Unauthorized`**.

1. **Endpoint Pengecekan Session (`/api/auth/session`)**:
   - Jika user **belum login**, endpoint ini **WAJIB mengembalikan status `200 OK`** dengan `{ authenticated: false }`.
   - **JANGAN PERNAH** mengembalikan `401` untuk pengecekan session tamu, karena akan menyebabkan loop redirect ke halaman login.

2. **Pendaftaran Route Publik di `proxy.ts`**:
   - Setiap route/API publik baru **wajib didaftarkan** di `PUBLIC_ROUTES` atau `PUBLIC_GET_API_ROUTES` pada `proxy.ts`.
   - Gunakan wildcard pattern `*` (contoh: `/api/playlists*`, `/api/posts*`, `/api/categories*`, `/api/tags*`) agar path dengan atau tanpa sub-path / query params tidak terblokir oleh proxy.

3. **Event Handler Interaktif (`useRequireAuth`)**:
   - Jangan melakukan redirect auth di level render komponen.
   - Gunakan wrapper hook `useRequireAuth` untuk membungkus interaksi user (contoh: onClick Like, Comment, Save to Playlist, Double-Tap Like), sehingga redirect ke `/login` hanya terpicu saat user menekan aksi tersebut secara sengaja.

---

## 3. Aturan Privasi Channel & Playlist (`public` vs `private`)

> [!IMPORTANT]
> Sistem memiliki dua layer visibilitas data:
> 1. `channel`: `'public'` | `'private'`
> 2. `isPublic`: `1` (publik/shared) | `0` (privat)

- **Pengunjung Tamu / Non-Logged-In (`!user`)**:
  - **HANYA BOLEH** melihat item dengan syarat ganda: `channel === 'public'` **DAN** `isPublic === 1`.
  - Jangan pernah hanya memfilter salah satu field (`isPublic` saja atau `channel` saja) pada feed, query detail, maupun search suggestions (`lib/queries/search.ts`).
- **User Logged-In**:
  - User dapat melihat item publik + item privat miliknya sendiri.
  - Tab `channel=private` hanya menampilkan data milik user yang sedang aktif.

---

## 4. Konvensi TanStack Query & Zustand (`services/queries/` & `stores/`)

1. **Struktur File**:
   - Semua custom query hooks ditaruh di `services/queries/` dan diekspor melalui `services/queries/index.ts`.
2. **Conditional Fetching (`enabled`)**:
   - Selalu sertakan prop `enabled` pada query yang tidak selalu dibutuhkan di semua tampilan (contoh: `usePublicPlaylistsQuery` hanya aktif saat `isPlaylistMode`).
3. **Sinkronisasi Cache Session**:
   - Pada mutasi login/logout (`useAuthMutation.ts`), perbarui query cache `["session"]` secara langsung (`queryClient.setQueryData(["session"], ...)`) agar UI navbar/state langsung ter-update seketika.

---

## 5. Drizzle ORM, Cache & Database Query Rules

1. **Pemisahan Server & Client (`server-only`)**:
   - Semua file query database di `lib/queries/` dan `lib/recommendations.ts` **WAJIB** menyertakan `import "server-only";` di baris pertama.
   - Gunakan `getCurrentUser()` dari `lib/auth.ts` (yang sudah di-cache per request via `React.cache`) untuk mendapatkan user aktif.
2. **Standarisasi Cache Redis (`lib/cache.ts`)**:
   - Semua key cache Redis wajib menggunakan prefix seragam:
     - Feed: `cache:feed:*`
     - Post Detail: `cache:post:detail:${user ? "auth" : "pub"}:${channelPref || "all"}:${idOrSlug}`
     - Recommendations: `cache:recommendations:${user ? "auth" : "pub"}:${channelPref || "all"}:${postId}`
     - Taxonomy: `cache:tags:all`, `cache:categories:all`
   - Saat ada mutasi post atau taxonomy, panggil `invalidatePostCache(id)`, `invalidateFeedCache()`, atau `invalidateTaxonomyCache()`.
3. **Shared Query Helpers**:
   - Gunakan helper bersama seperti `resolvePlaylistSampleThumbnails` dari `lib/queries/playlists.ts` untuk menghindari duplikasi logika resolusi sample presigned URL media.
