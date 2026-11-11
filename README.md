# 🛒 Zakupy

Self-hosted lista zakupów z synchronizacją na żywo (SvelteKit + SQLite + SSE, PWA).
Pełny plan, architektura i konwencje: [PLAN.md](PLAN.md).

## Wymagania

- Node.js 24 LTS (`node -v`)

## Start lokalnie

```bash
npm install
cp .env.example .env   # opcjonalnie — domyślnie baza ląduje w ./data/zakupy.db
npm run dev            # http://localhost:5173
```

## Skrypty

| Komenda | Opis |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run check` | sprawdzenie typów |
| `npm run build` | build produkcyjny do `build/` |
| `npm start` | uruchomienie buildu (`node build`) |

## Struktura

```
src/lib/server/db/          połączenie z SQLite, migracje (migrations/*.sql), queries.ts
src/lib/server/categories.ts  słownik PL: produkt → kategoria
src/lib/server/events.ts    rozgłaszanie zmian (SSE)
src/lib/parse.ts            parsowanie „2 mleko”, „mleko x2” (front + back)
src/lib/components/         komponenty UI
src/lib/types.ts            wspólne typy
src/routes/l/[id]/          widok listy
src/routes/api/             endpointy REST + /api/events + /api/health
src/service-worker/         PWA / cache
deploy/                     compose.yaml dla Dockge, przykładowy nginx
```

Nowa zmiana schematu bazy = nowy plik `NNN_opis.sql` w `src/lib/server/db/migrations/`
(migracje uruchamiają się automatycznie przy starcie, starych plików nie edytujemy).

## Wdrożenie

Push na `main` → GitHub Actions buduje obraz `ghcr.io/<nick>/zakupy:latest` →
w Dockge stack **zakupy** → **Update**. Szczegóły w [PLAN.md](PLAN.md#7-workflow-na-co-dzień).
