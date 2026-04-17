# Food Lens

An installable iOS web app for identifying Malaysian dishes. Type a name (live typeahead over 115 curated dishes) or snap a photo. Photo recognition calls a vision model via [OpenRouter](https://openrouter.ai/); matched dishes show their curated card, unknown dishes fall back to the model's name + short description.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Static Web App Manifest (installable, no service worker)
- Vercel serverless function at [api/recognize.ts](api/recognize.ts) proxying OpenRouter
- Data sourced from [data/Malaysian Food.xlsx](data/Malaysian%20Food.xlsx), converted once to [src/data/dishes.json](src/data/dishes.json)

## Project layout

```
food-lens/
  api/
    recognize.ts              serverless function: POST image -> Dish
    _lib/match.ts             dataset lookup
  data/                       source spreadsheet
  scripts/
    build-data.mjs            xlsx -> src/data/dishes.json
    build-icons.mjs           favicon.svg -> icon-192/512, apple-touch-icon
  public/                     manifest + icons
  src/
    components/               HomeScreen, Typeahead, LoadingScreen, ResultCard, ErrorScreen
    lib/                      dish, search, recognize, image
    App.tsx, main.tsx, index.css
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

```
OPENROUTER_API_KEY=sk-or-v1-...
VISION_MODEL=openai/gpt-4o
```

To switch models later (e.g. Gemini Flash for speed/cost), change `VISION_MODEL` to any OpenRouter vision-capable slug, e.g. `google/gemini-flash-1.5` or `google/gemini-2.5-flash`. No code changes needed.

## Develop

UI-only (no `/api/*`, faster reload):

```bash
npm install
npm run data     # one-time: build dishes.json from the xlsx
npm run icons    # one-time: generate PNG icons
npm run dev
```

Full-stack (Vite + emulated serverless functions on one port, reads `.env`):

```bash
npm i -g vercel     # one-time
vercel link         # one-time, associates this folder with the Vercel project
npm run dev:full
```

Both commands print a LAN URL (`http://192.168.x.x:...`). Open it in iPhone Safari on the same Wi-Fi, then **Share → Add to Home Screen** to install. The camera uses `<input capture="environment">`, so iOS opens the real camera without needing HTTPS during LAN development.

## Deploy to Vercel

1. Import `PotterA011/food-lens` on [vercel.com/new](https://vercel.com/new). The framework is auto-detected as Vite.
2. Under **Settings → Environment Variables**, add:
   - `OPENROUTER_API_KEY` (your OpenRouter key)
   - `VISION_MODEL` (e.g. `openai/gpt-4o`)
3. Deploy. Every push to `main` auto-deploys.

## How recognition works

1. Client downscales the photo to 1600 px max (JPEG q=0.85) to stay well under Vercel's 4.5 MB body limit.
2. Client POSTs the image to `/api/recognize`.
3. The serverless function forwards it to OpenRouter with a strict JSON schema response.
4. If the model says it isn't food, the UI shows "That's not food".
5. Otherwise the function looks up the returned name in `dishes.json`. A match returns the curated card; a miss returns a minimal card with the model's name + description.

Calories, price (MYR), and ingredients are not generated yet and remain as "Not available yet" placeholders until a real source is wired.
