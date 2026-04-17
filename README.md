# Food Lens

An installable iOS web app for identifying Malaysian dishes. Type a name (live typeahead over 115 dishes) or snap a photo and get a card back with origin, type, and description. Google Vision and richer nutrition/price data land later — recognition is currently a local stub.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Static Web App Manifest (installable, no service worker — keeps the build pure static)
- Data sourced from `[data/Malaysian Food.xlsx](data/Malaysian%20Food.xlsx)`, converted once to `[src/data/dishes.json](src/data/dishes.json)`

## Project layout

```
food-lens/
  data/                       source spreadsheet
  scripts/
    build-data.mjs            xlsx -> src/data/dishes.json
    build-icons.mjs           favicon.svg -> icon-192/512, apple-touch-icon
  public/                     manifest + icons
  src/
    components/               HomeScreen, Typeahead, LoadingScreen, ResultCard
    lib/                      dish, search, recognize
    App.tsx, main.tsx, index.css
```

## Develop on your iPhone (same Wi-Fi)

```bash
cd food-lens
npm install
npm run data     # one-time: build dishes.json from the xlsx
npm run icons    # one-time: generate PNG icons
npm run dev
```

Vite prints a LAN URL such as `http://192.168.x.x:5173`. Open it in iPhone Safari (phone and Mac on the same Wi-Fi), then **Share → Add to Home Screen**. The app launches standalone, no Safari chrome.

The "Snap it" button uses `<input capture="environment">`, so iOS opens the real camera without needing HTTPS during LAN development.

## Deploy to a VPS

```bash
npm run build
rsync -av dist/ user@vps:/var/www/food-lens/
```

Minimal Caddyfile (auto-HTTPS, SPA fallback, gzip):

```
food-lens.example.com {
    root * /var/www/food-lens
    try_files {path} /index.html
    file_server
    encode gzip
}
```

Nginx equivalent of the key bits:

```
server {
    server_name food-lens.example.com;
    root /var/www/food-lens;
    location / { try_files $uri /index.html; }
}
```

## What's stubbed

- `src/lib/recognize.ts` returns a random dish after 800 ms. When wiring Google Vision, replace the body with a `fetch('/api/recognize', ...)` call and keep the same `Promise<Dish>` signature — nothing else in the UI changes.
- Calories, price (MYR), and ingredients are not in the dataset yet. The result card renders these rows as muted "Not available yet" so the layout is stable once the fields are populated.

