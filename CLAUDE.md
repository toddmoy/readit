# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ReadIt is a local EPUB reader that hijacks distracting websites. Blocked domains are redirected via `/etc/hosts` to a local Express server that serves an epub.js-based reader. An interactive Ink (React) TUI manages domains while the server runs.

## Commands

```bash
npm start              # sudo node server.js — foreground with interactive TUI
npm run start:bg       # background mode (logs to /tmp/readit.log)
npm run stop           # kill background process
npm run block -- x.com # CLI: block domain (also adds www. variant)
npm run unblock -- x.com
npm run setup          # init dirs + add /etc/hosts entries
npm run teardown       # remove /etc/hosts entries
```

Requires `sudo` because it binds port 443 and writes to `/etc/hosts`.

## Architecture

**server.js** — Express app on HTTPS:443 (blocked domains) + HTTP:3141 (direct). Manages `/etc/hosts` entries on startup/shutdown. Exports helpers (`setupHosts`, `teardownHosts`, `getDomainList`, etc.) consumed by `tui.js`. APIs: `GET /api/books`, `GET/POST /api/state`. Catch-all route serves `index.html` so any blocked domain path loads the reader.

**tui.js** — Ink/React TUI rendered after server starts. Three modes: main (banner + `[a] add [d] remove [q] quit`), add (text input), remove (arrow-key selector). On domain changes: updates `domains.txt` + `/etc/hosts`, regenerates mkcert certs, hot-reloads HTTPS via `setSecureContext()`. Uses `React.createElement` directly (no JSX, no build step).

**public/** — Vanilla JS frontend. `index.html` shows book card grid (auto-redirects to last book if set). `reader.html` renders EPUBs with epub.js (CDN). `cards.js` generates 3 card variants (stack/overlay/typographic) with procedural color palettes. `style.css` is a dark theme using OKLCH color space + CSS variables. Tailwind extended via `tailwind-setup.js`.

**State** — `state.json` stores `{ lastBook, textSize, positions: { "file.epub": "cfi" } }`. `domains.txt` is the source of truth for blocked domains (one per line).

**Data flow**: blocked domain → `/etc/hosts` redirects to 127.0.0.1 → HTTPS server → serves reader frontend → epub.js renders book → position saved to `state.json`.

## Key Conventions

- CJS throughout (`require`/`module.exports`). Ink v3 + React 17 for CJS compatibility.
- No build step, no transpilation, no JSX. TUI uses `React.createElement` aliased as `e`.
- Domain operations always handle the `www.` variant automatically.
- Cert regeneration (`mkcert`) and HTTPS hot-reload happen on every domain add/remove in the TUI. CLI commands (`npm run block`) do NOT auto-regenerate certs.
- `books/` and `certs/` are git-ignored. `domains.txt` and `state.json` are tracked.
