<div align="center">

<img src="./public/logos/flaredrive-logo-h.png" width="200" alt="FlareDrive Logo" />

# FlareDrive: REMASTERED

[<img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare">](https://deploy.workers.cloudflare.com/?url=https://github.com/project-epb/flaredrive-rev)

</div>

[简体中文](README.zh_CN.md)

Cloud-native S3-compatible bucket manager built on Cloudflare Workers.

This repository is under active refactoring. For architecture notes and progress tracking, see:

- [docs/architecture-draft.md](docs/architecture-draft.md)
- [docs/migration-todos.md](docs/migration-todos.md)

## What it is

- **Backend**: Cloudflare Workers + Hono (`/api/**`)
- **Database**: Cloudflare D1 (SQLite-compatible) + Drizzle ORM
- **Frontend**: Vue 3 SPA (Naive UI) bundled by Vite and served via Workers assets
- **Storage**: S3-compatible providers (Cloudflare R2 / AWS S3 / MinIO / ...)

## Features (current)

- User registration/login (cookie-based sessions)
- Bucket configuration & connection test (stored in D1)
- Object browser (list/preview/delete)
- Upload via presigned URL + upload history recording
- Raw file access via `/api/raw/:bucketId/*` with access checks
- Site settings stored in D1 (fallback: env → default)

UI is currently English-only.

## Requirements

- Node.js 22+ (recommended: 24.x)
- Bun
- Cloudflare account (for deploy / production D1)

## Local development

Install dependencies:

```bash
bun install
```

Optional: create a local env file (frontend build-time options):

```bash
cp .env.sample .env
```

Apply D1 migrations to local database:

```bash
bun run drizzle:push
```

Start dev server:

```bash
bun dev
```

Default dev URL: `http://localhost:5880`

## Authentication / creating the first admin

There are two common ways:

1. **Enable registration**, then the first registered user (ID=1) becomes admin automatically.

- The flag is resolved by **DB → env → default**.
- In `wrangler.jsonc`, `ALLOW_REGISTER` defaults to `false`.
- Admins can change it later in the UI: `/@admin/settings`.

2. **Admin create endpoint** (no public registration needed)

- Set `ADMIN_CREATE_TOKEN` as a Worker secret.
- Then run:

```bash
bun run user:create -- --url http://localhost:5880 --email admin@example.com --password "StrongPass123" --token "<ADMIN_CREATE_TOKEN>"
```

Script details: [scripts/create-user.ts](scripts/create-user.ts)

## Useful scripts

- `bun dev` - start dev server
- `bun run build` - build frontend + worker assets
- `bun run deploy` - deploy to Cloudflare Workers
- `bun run drizzle:push` - apply D1 migrations locally
- `bun run drizzle:push-prod` - apply D1 migrations to production (D1 HTTP)
- `bun run drizzle:studio` - open Drizzle Studio (local)
- `bun run drizzle:studio-prod` - open Drizzle Studio (production)

## Environment variables

Frontend (Vite) env vars live in:

- `.env` (optional)
- `.env.development` / `.env.production`
- `.env.sample` lists supported keys

Backend (Worker) env vars are configured in Cloudflare (Dashboard / Wrangler):

- `ALLOW_REGISTER` (string boolean)
- `SITE_NAME` (instance display name)
- `ADMIN_CREATE_TOKEN` (enables `/api/auth/admin-create`)

Production Drizzle (D1 HTTP driver) requires:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_DATABASE_ID`

## Project structure

- `backend/` - Worker API (Hono)
- `frontend/` - Vue SPA
- `db/` - Drizzle schema
- `drizzle/` - SQL migrations
- `common/` - shared utilities

## Screenshots

**My Buckets**

![](https://github.com/user-attachments/assets/e36d3442-6b73-445a-b672-d1b8851d53ce)

![](https://github.com/user-attachments/assets/77ad92fe-f530-4485-9e59-f56d0b642572)

**Gallery Layout**

![](https://github.com/user-attachments/assets/a815f682-fac4-459b-b53a-9c219966be3d)

**Book Layout**

![](https://github.com/user-attachments/assets/27135561-6ab7-40fd-8bae-3cb833f74c4c)

**Manga!**

![](https://github.com/user-attachments/assets/bcb31353-7709-4152-b6a9-8297e300a387)

**File Info**

![](https://github.com/user-attachments/assets/f8e5c6ab-7d16-48f3-972c-49ef109549b8)

## License

> MIT License
>
> - Copyright (c) 2022 Siyu Long (before f82ffdc)
> - Copyright (c) 2025 Dragon Fish (remastered version)

> FlareDrive Logos & mascots
>
> - CC BY-SA 4.0
> - See more: [README](public/logos/README.md)
