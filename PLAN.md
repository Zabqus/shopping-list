# 🛒 Zakupy — self-hosted lista zakupów

Prosta, szybka i ładna lista zakupów hostowana na własnym homelabie (Proxmox → Dockge).
Dostęp z telefonu i komputera przez przeglądarkę (PWA — można „zainstalować” jak apkę).
Zmiany synchronizują się na żywo między urządzeniami.

> Ten plik jest „źródłem prawdy” dla projektu — czytają go ludzie i asystenci AI (Cursor, Claude Code).
> Aktualizuj go, gdy zmienia się plan lub architektura.

---

## 1. Cele projektu

- **Szybkość** — dodanie produktu ma trwać 2 sekundy (jedno pole, Enter, autouzupełnianie).
- **Wygoda w sklepie** — duże przyciski, grupowanie po kategoriach, działa przy słabym zasięgu.
- **Live sync** — dodajesz na PC → od razu widać na telefonie (i odwrotnie).
- **Dobry wygląd** — mobile-first, czytelny, tryb jasny/ciemny.
- **Łatwa rozbudowa** — czysty podział na warstwy, migracje bazy, API gotowe pod integracje.
- **Bezpieczeństwo repo** — żadnych haseł, tokenów ani danych w gicie (patrz sekcja 8).

---

## 2. Stack technologiczny

| Warstwa | Technologia | Dlaczego |
|---|---|---|
| Język | **TypeScript** (całość) | jeden język na froncie i backendzie, świetne wsparcie w Cursorze |
| Framework | **SvelteKit** + `@sveltejs/adapter-node` | frontend + API w jednym projekcie, szybki, mało kodu |
| Baza danych | **SQLite** (wbudowany `node:sqlite`) | jeden plik, zero konfiguracji, backup = kopia pliku |
| Migracje | proste pliki SQL w `src/lib/server/db/migrations/` | wersjonowany schemat, bezbolesna rozbudowa |
| Live sync | **SSE** (Server-Sent Events) | prostsze niż WebSocket, działa przez nginx |
| PWA | Web App Manifest + Service Worker (SvelteKit) | ikonka na ekranie telefonu, offline |
| Style | CSS (zmienne CSS, bez ciężkich frameworków) | lekko, pełna kontrola nad wyglądem |
| Runtime | **Node.js 24 LTS** | |
| Kontener | Docker (multi-stage build, obraz `node:24-alpine`) | mały obraz, ~50 MB RAM |
| CI/CD | **GitHub Actions** → obraz w **GHCR** | push na `main` = nowy obraz |
| Hosting | **Dockge** na Proxmoxie | aktualizacja jednym kliknięciem („Update”) |
| Dostęp | **nginx** (reverse proxy, HTTPS) + **Tailscale** | nic nie jest wystawione do internetu |

---

## 3. Architektura

```
 Telefon / PC (przeglądarka, PWA)
            │  HTTPS (Tailscale)
            ▼
        nginx (reverse proxy, certyfikat)
            │  http://<host>:3000
            ▼
   ┌──────────────────────────────┐
   │  Kontener „zakupy” (Node)    │
   │  SvelteKit: UI + REST API    │
   │  SSE: /api/events (live)     │
   │  SQLite: /app/data/zakupy.db │◄── volume ./data (Dockge)
   └──────────────────────────────┘
```

### Model danych (MVP)

- **lists** — `id`, `name`, `icon`, `position`, `created_at`
- **items** — `id`, `list_id`, `name`, `quantity`, `unit`, `note`, `category_id`, `checked`, `checked_at`, `position`, `created_at`, `updated_at`
- **categories** — `id`, `name`, `icon`, `position` (kolejność = kolejność alejek w sklepie)
- **products** (historia / słownik) — `name`, `category_id`, `use_count`, `last_used_at` → autouzupełnianie i automatyczne kategorie

### API (REST, JSON)

```
GET    /api/lists                    lista list
POST   /api/lists                    nowa lista
GET    /api/lists/:id/items          produkty na liście
POST   /api/lists/:id/items          dodaj produkt (parsuje „2 mleko”, „mleko x2”)
PATCH  /api/items/:id                zmień (odhacz, ilość, kategoria, notatka)
DELETE /api/items/:id                usuń
POST   /api/lists/:id/clear-checked  usuń odhaczone
GET    /api/suggest?q=ml             podpowiedzi z historii
GET    /api/events                   strumień SSE ze zmianami (live sync)
GET    /api/health                   healthcheck dla Dockera
```

---

## 4. Funkcje

### MVP (wersja 1)
- [ ] Jedno pole do dodawania na górze, autofocus, Enter = dodaj
- [ ] Parsowanie ilości: `2 mleko`, `mleko x2`, `1kg ziemniaki`
- [ ] Autouzupełnianie z historii zakupów
- [ ] Automatyczne kategorie (wbudowany słownik PL + uczenie się z twoich wyborów)
- [ ] Grupowanie po kategoriach w ustalonej kolejności
- [ ] Odhaczanie tapnięciem, odhaczone spadają na dół (wyszarzone)
- [ ] Usuwanie + **„Cofnij”** (toast z undo)
- [ ] „Wyczyść odhaczone”
- [ ] Kilka list (np. Spożywcze, Dom, Budowlane)
- [ ] Live sync między urządzeniami (SSE)
- [ ] PWA: manifest, ikona, instalacja na telefonie, cache aplikacji
- [ ] Tryb jasny / ciemny (automatycznie wg systemu)
- [ ] Healthcheck + Docker + CI

### Wersja 2 — wygoda
- [ ] **Tryb offline** z kolejką zmian (synchronizacja po powrocie sieci)
- [ ] Swipe w lewo = usuń, swipe w prawo = odhacz
- [ ] Edycja produktu (ilość, notatka, kategoria) w bottom-sheet
- [ ] Przeciąganie kategorii = własna kolejność alejek
- [ ] „Kup znowu” — często kupowane produkty jednym kliknięciem
- [ ] Wake Lock — ekran nie gaśnie w trybie zakupów
- [ ] Dodawanie głosem (Web Speech API)
- [ ] Haptyka (wibracja przy odhaczeniu)

### Wersja 3 — rozbudowa
- [ ] Integracja z **Home Assistant** (dodawanie głosem przez asystenta)
- [ ] Bot **Telegram** / skróty Siri / Tasker przez API z tokenem
- [ ] Skanowanie kodów kreskowych (aparat) + Open Food Facts
- [ ] Ceny i budżet, historia wydatków
- [ ] Przepisy → składniki na listę jednym kliknięciem
- [ ] Szablony list („Grill”, „Wyjazd”)
- [ ] Prosta autoryzacja / użytkownicy (jeśli kiedyś poza Tailscale)
- [ ] Eksport / import (JSON), automatyczny backup bazy

---

## 5. Struktura repozytorium

```
zakupy/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/            # połączenie, migracje, zapytania
│   │   │   ├── events.ts      # SSE — rozgłaszanie zmian
│   │   │   └── parse.ts       # parsowanie „2 mleko”, kategorie
│   │   ├── components/        # komponenty UI (Svelte)
│   │   └── types.ts           # wspólne typy (front + back)
│   ├── routes/
│   │   ├── +page.svelte       # główny widok listy
│   │   └── api/...            # endpointy REST + SSE
│   └── service-worker.ts      # PWA
├── static/                    # ikony, manifest
├── .github/workflows/
│   └── docker.yml             # build + push obrazu do GHCR
├── deploy/
│   ├── compose.yaml           # stack do wklejenia w Dockge
│   └── nginx.conf.example     # przykładowy config nginx
├── Dockerfile
├── .env.example               # PRZYKŁADOWE zmienne (bez sekretów!)
├── .gitignore
├── .dockerignore
├── PLAN.md                    # ten plik
└── README.md
```

---

## 6. Plan działania (kolejność)

### Etap 0 — Setup (ręcznie)
1. Folder projektu otwarty w Cursorze
2. Node.js 24 LTS (`node -v`)
3. Puste repo na GitHubie (prywatne) → `git init`, `git remote add origin ...`
4. Folder podpięty w aplikacji Claude („Add folder”)

### Etap 1 — Szkielet
- Projekt SvelteKit + TypeScript + adapter-node
- `.gitignore`, `.env.example`, `README.md`
- Baza SQLite + system migracji
- ✅ `npm run dev` działa lokalnie

### Etap 2 — MVP backend
- Tabele, zapytania, endpointy REST
- Parsowanie ilości, słownik kategorii, podpowiedzi
- SSE do live sync
- ✅ API przetestowane

### Etap 3 — MVP frontend
- Widok listy, pole dodawania z autouzupełnianiem, grupy kategorii
- Odhaczanie, usuwanie z „Cofnij”, wiele list
- Live sync w UI, tryb ciemny, wygląd mobile-first
- PWA (manifest, ikony, service worker)
- ✅ działa na telefonie w sieci lokalnej

### Etap 4 — Wdrożenie
- `Dockerfile` (multi-stage), `.dockerignore`
- GitHub Actions → GHCR
- `deploy/compose.yaml` → nowy stack w Dockge
- Wpis w nginx + certyfikat → dostęp przez Tailscale
- ✅ działa na homelabie, instalacja PWA na telefonie

### Etap 5+ — Rozbudowa
- Funkcje z wersji 2 i 3 (sekcja 4), po kolei, każda jako osobny commit/PR

---

## 7. Workflow na co dzień

### Lokalnie (PC)
```bash
npm install          # raz, po sklonowaniu
npm run dev          # serwer deweloperski: http://localhost:5173
npm run check        # sprawdzenie typów
npm run build        # build produkcyjny
```
Lokalna baza ląduje w `./data/zakupy.db` (folder ignorowany przez gita).

### Wdrożenie nowej wersji
1. `git add . && git commit -m "..." && git push`
2. GitHub Actions buduje obraz → `ghcr.io/<twoj-nick>/zakupy:latest`
3. W Dockge: stack **zakupy** → **Update** (pobiera nowy obraz i restartuje)
4. Dane zostają w volume `./data` — aktualizacja ich nie rusza

### Backup
Wystarczy skopiować `data/zakupy.db` ze stacka w Dockge (np. `/opt/stacks/zakupy/data/`).
Można dodać do backupów Proxmoxa / cron.

---

## 8. Bezpieczeństwo i sekrety 🔒

**Zasada: w repozytorium nie ma żadnych haseł, tokenów, kluczy ani danych.**

- Konfiguracja przez **zmienne środowiskowe**. W repo jest tylko `.env.example` z przykładowymi, nieprawdziwymi wartościami.
- Prawdziwy `.env` istnieje tylko lokalnie / na serwerze i jest w `.gitignore`.
- W Dockge zmienne środowiskowe wpisuje się w edytorze stacka (sekcja `.env`) — nie trafiają do gita.
- **Baza danych** (`data/`, `*.db`) jest w `.gitignore` — dane nie idą na GitHuba.
- **GitHub Actions** pushuje obraz do GHCR wbudowanym tokenem `GITHUB_TOKEN` — nie trzeba tworzyć żadnego sekretu.
- Jeśli obraz w GHCR jest **prywatny**, serwer musi się zalogować raz:
  `docker login ghcr.io -u <nick>` z tokenem PAT (uprawnienie `read:packages`) — token zostaje tylko na serwerze.
  Alternatywa: ustawić paczkę jako publiczną (w obrazie nie ma żadnych sekretów).
- Przyszłe tokeny (np. API dla Home Assistant / Telegram) → tylko przez zmienne środowiskowe.
- Certyfikaty, configi nginx z prawdziwymi domenami/IP → w repo tylko jako `*.example`.

Minimalny `.gitignore` (fragment):
```
node_modules/
.svelte-kit/
build/
data/
*.db
*.db-*
.env
.env.*
!.env.example
```

Przed każdym pushem warto rzucić okiem na `git status` / `git diff --staged`.

---

## 9. Konwencje (dla ludzi i AI)

- TypeScript wszędzie, `strict: true`; wspólne typy w `src/lib/types.ts`.
- Kod dostępu do bazy tylko w `src/lib/server/` (nigdy w komponentach).
- Każda zmiana schematu bazy = **nowy plik migracji** (nie edytujemy starych).
- Każda zmiana danych w API → wysłanie zdarzenia SSE (żeby inne urządzenia się odświeżyły).
- UI: mobile-first, duże pola dotyku (min. 44 px), teksty po polsku.
- Małe, opisowe commity (`feat: autouzupełnianie`, `fix: sortowanie kategorii`).
- Brak nowych zależności bez potrzeby — projekt ma zostać lekki.
- Po zmianie planu/architektury → aktualizacja tego pliku.
