# ⚓ COLREGs Trainer

**Play it:** https://brycelloyd.github.io/ColregsApp/

A mobile-first web app for learning the **International Regulations for Preventing Collisions at Sea (COLREGs)**, the Rules of the Road. It's installable on a phone and works offline.

## Features

- **🏆 Challenge.** Seven levels of animated scenarios and multiple-choice questions, each level harder than the last. You have 3 lives, and there's a leaderboard.
- **🧭 Watchkeeper (free play).** Steer your own ship through live traffic. A referee judges every encounter against the Rules: early, bold action when you give way, holding course and speed when you stand on, sound signals and passing distance.
- **🚢 Rules & scenarios.** A cheat-sheet (Rules 5–19, 34 and Traffic Separation Schemes), practice sets and a quiz.
- **💡 Lights & sounds.** Lights, day shapes and sound signals you can play, with night and fog scenarios and a quiz.
- **🛟 Buoyage.** IALA marks (Region A is the standard; Region B is available in Learn), animated light rhythms, buoyage scenarios and a quiz.
- **🚩 Signal flags.** All 26 International Code of Signals flags, with a quiz.
- **Varied practice.** Scenarios rotate, switch between day and night, swap vessel types and vary the approach angle. Questions come in several formats: multiple choice, true/false, spot the mistake and put in order. After an answer you may get a sound-signal follow-up, and if you got through by luck it explains why the move was still dangerous.

> A study aid only. Always refer to the official COLREG text and proper training.

## Run it locally

No build step. Any static file server works:

```bash
npm run dev          # serves on http://localhost:5173
# or
python3 -m http.server 5173
```

Opening `index.html` directly also works, but without offline mode.

## Deploy

It's a static site, so you can host it anywhere.

- **Vercel:** import the GitHub repo, choose framework "Other", leave the build command empty and set the output directory to `.`.
- **GitHub Pages** (current): Settings → Pages → Deploy from a branch → `Website-Dev` / `(root)`. Every push to `Website-Dev` updates the site.

When you deploy changes, bump `CACHE` in `sw.js` (for example `colregs-v2`) so installed copies update.

## Shared leaderboard (optional)

Without setup, Challenge scores are kept on each device. To share a board between friends:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql`.
3. Copy the project URL and the **anon public** key (Project Settings → API) into `js/config.js`.

The anon key is designed to be public. Row Level Security only allows reading and inserting scores. You can delete silly entries in the Supabase Table Editor.

## Tests

```bash
npm install
npx playwright install chromium
npm run check   # syntax check of every JS file
npm test        # headless smoke tests: scenario outcomes, Challenge build, Watchkeeper referee
```

If Playwright can't download a browser, point it at an existing one: `CHROMIUM_PATH=/path/to/chrome npm test`.

## Project structure

```
index.html              markup for all screens and overlays
css/styles.css          all styles
js/config.js            public config (Supabase URL + anon key)
js/00-core.js … 99-boot.js   app code, loaded in numeric order (see CLAUDE.md)
sw.js                   offline cache (service worker)
manifest.webmanifest    install-to-home-screen metadata
icons/                  app icons
supabase/schema.sql     leaderboard table + security rules
tests/                  smoke and syntax tests
```
