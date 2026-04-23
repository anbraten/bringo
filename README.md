# BringO

Collaborative packing lists for trips. Create a list, share the link, everyone claims what they bring. No accounts.

## Stack

- [Nuxt 4](https://nuxt.com) (Vue 3, TypeScript)
- [Turso](https://turso.tech) (SQLite, via `@libsql/client`)

## Setup

```bash
cp .env.example .env
# fill in TURSO_URL and TURSO_AUTH_TOKEN
npm install
npm run dev
```

For local dev without Turso, set `TURSO_URL=file:./local.db` — the DB file is created automatically on first run.

## Deploy

```bash
npm run build
node .output/server/index.mjs
```

Set `TURSO_URL` and `TURSO_AUTH_TOKEN` in your environment.
