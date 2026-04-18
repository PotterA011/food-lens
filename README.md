# Food Lens

An installable iOS web app for identifying Malaysian dishes. Type a name (semantic typeahead over the full dataset) or snap a photo. Photo recognition calls a vision model via [OpenRouter](https://openrouter.ai/); the matched dish is enriched with AI-generated ingredients + history (cached forever after first view). Signed-in users can save dishes to a personal list and correct the model when it gets something wrong — corrections grow the dataset.

## Stack

- Vite + React 19 + TypeScript + Tailwind CSS v4
- Node + Express production server at [server.mjs](server.mjs) (Render-friendly)
- Neon Postgres with `pgvector` for semantic search, enrichment cache, users, sessions, saved dishes, and corrections
- OpenRouter (vision + enrichment) + OpenAI (`text-embedding-3-small` for embeddings)
- Google OAuth 2.0 for sign-in, signed httpOnly session cookie
- Static Web App Manifest (installable, no service worker)

## Project layout

```
food-lens/
  migrations/001_init.sql     schema: users, sessions, dishes, enrichments, saved_dishes, corrections
  server/
    db.mjs                    pg pool
    embeddings.mjs            OpenAI embeddings wrapper
    enrichment.mjs            OpenRouter ingredients + history generator (cached)
    matcher.mjs               embedding-based findDish (with offline fallback)
    auth.mjs                  Google OAuth routes + session middleware
    slug.mjs                  dish id generator
    routes/
      recognize.mjs           POST /api/recognize (vision)
      search.mjs              GET  /api/search (pgvector cosine)
      dish.mjs                GET  /api/dish/:id (+ lazy enrichment)
      correct.mjs             POST /api/correct (dataset self-expansion)
      saved.mjs               GET/POST/DELETE /api/saved
  server.mjs                  wires everything up, serves dist/
  scripts/
    migrate.mjs               applies migrations/*.sql
    seed-dishes.mjs           seeds + embeds dishes.json into the `dishes` table
    build-data.mjs            xlsx -> src/data/dishes.json
    build-icons.mjs           favicon.svg -> PNG icons
  public/                     manifest + icons
  src/
    contexts/AuthContext.tsx
    components/               AccountMenu, HomeScreen, Typeahead, ResultCard, CorrectDialog, ...
    pages/SavedPage.tsx
    lib/                      api, dish, search, recognize, image
    App.tsx, main.tsx, index.css
```

## Environment variables

Copy [.env.example](.env.example) to `.env` and fill in every block:

- **OpenRouter** — `OPENROUTER_API_KEY`, `VISION_MODEL` (e.g. `openai/gpt-4o` or `google/gemini-flash-1.5`). Optional `ENRICHMENT_MODEL` if you want a cheaper model for ingredients/history.
- **OpenAI** — `OPENAI_API_KEY` (used only for embeddings; ~$0.02 / 1M tokens).
- **Neon Postgres** — `DATABASE_URL` (pooled connection string, `sslmode=require`).
- **Google OAuth** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Register the authorized redirect URI `${PUBLIC_URL}/auth/google/callback` in Google Cloud Console.
- **Session** — `SESSION_SECRET` (32+ random bytes: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).
- **Public URL** — `PUBLIC_URL=http://localhost:3000` locally, `https://your-app.onrender.com` in production.

Everything still runs without DB/OAuth (the UI falls back to the bundled static dataset), but search, login, saved dishes, and corrections require the full configuration.

## First-time setup

```bash
npm install
npm run data          # one-time: build dishes.json from the xlsx
npm run icons         # one-time: generate PNG icons

# Provision Neon (free tier: https://neon.tech), copy DATABASE_URL into .env.
npm run migrate       # creates tables + enables pgvector + pgcrypto
npm run seed          # upserts all 115 dishes + embeds each one (needs OPENAI_API_KEY)
```

Re-run `npm run seed` any time you edit `src/data/dishes.json`; pass `--force` to re-embed every row.

## Develop

Frontend only (no `/api/*`, fastest reload):

```bash
npm run dev
```

Full stack (Vite dev server + Express API on one port):

```bash
npm run build         # or: tsc -b && vite build
npm start             # serves dist/ + all /api/* + /auth/*
```

Both commands print a LAN URL. Open it in iPhone Safari, then **Share → Add to Home Screen** to install.

## Deploy to Render (Web Service)

- **Build Command:** `npm run build`
- **Pre-Deploy Command (optional):** `npm run migrate` — run once or on schema changes
- **Start Command:** `npm start`

Environment variables to set in the Render dashboard: every variable listed in `.env.example`. `PUBLIC_URL` must equal your Render URL (e.g. `https://food-lens.onrender.com`), and that URL plus `/auth/google/callback` must be added as an authorized redirect URI in Google Cloud Console.

## How the pieces fit

1. **Recognize** — the client downscales the photo to 1600 px, POSTs it to `/api/recognize`, which calls OpenRouter with a strict JSON schema. The returned name is matched to the `dishes` table by embedding cosine distance (threshold 0.25); misses return a minimal card with the model's short description.
2. **Enrich** — the result card fetches `/api/dish/:id`, which returns the dish + cached ingredients + history. If no cache row exists, OpenRouter generates them on the spot and the server stores them in `enrichments` (pay once per dish, forever).
3. **Search** — the typeahead debounces 300 ms, embeds the query via OpenAI, and runs `ORDER BY embedding <=> $1` against the `dishes` table. A local substring fallback keeps the UI instant for very short queries.
4. **Correct** — tapping "Not this? Correct it" on the result card sends the user's correction to `/api/correct`. The server embeds the corrected name, looks for a nearby existing dish, otherwise generates metadata + enrichment + embedding and inserts a new `dishes` row (`is_curated=false`). The result card re-renders with the corrected dish. Every correction is logged in `corrections` for later review.
5. **Sign-in + saved** — `/auth/google` starts Google OAuth; the callback upserts the user and sets a signed `hl_sess` cookie. The heart icon on the result card and the account menu's "Saved dishes" page are both gated on that session.
