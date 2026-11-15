# Zakupy

Self-hosted shopping list with live sync between devices. Built with SvelteKit, SQLite, and SSE. Works as a PWA in the browser.

## Features

- Fast add flow (one field, Enter, autocomplete)
- Category grouping for shopping
- Live sync across devices (SSE)
- Offline queue for check / delete (IndexedDB) with pending-change indicator
- Light / dark / system theme (manual toggle in the header)
- Single SQLite file — easy backup

## Requirements

- [Node.js](https://nodejs.org/) 24+

## Getting started

```bash
npm install
cp .env.example .env   # optional — defaults to ./data/zakupy.db
npm run dev            # http://localhost:5173
```

### Production (local)

```bash
npm run build
npm start              # http://localhost:3000
```

### Docker (optional)

```bash
docker build -t zakupy .
docker run -p 3000:3000 -v ./data:/app/data zakupy
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | development server |
| `npm run check` | type check |
| `npm run build` | production build → `build/` |
| `npm start` | run production build |

## Configuration

Copy `.env.example` to `.env` if you need to override defaults:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `./data/zakupy.db` | SQLite database file |
| `PORT` | `3000` | production server port |
| `HOST` | `0.0.0.0` | bind address |
| `ORIGIN` | — | public URL (needed behind a reverse proxy for CSRF) |

Database migrations run automatically on startup. Add new schema changes as `NNN_description.sql` under `src/lib/server/db/migrations/` — do not edit existing migration files.

## More

Architecture, API, and day-to-day workflow: [PLAN.md](PLAN.md).
