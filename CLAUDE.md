# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graderoom is a grade visualization web app that automatically scrapes grades from Powerschool for high school students. It supports three schools: Bellarmine College Preparatory (BELL/BCP), BASIS Independent Silicon Valley (BISV), and Notre Dame High School (NDSJ).

## Setup & Running

**Prerequisites:** Python >= 3.6, Node.js >= 22, Redis, MongoDB

```bash
pip install -r requirements.txt
npm i
```

Create a `.env` file from `.env.example` with port, SECRET, PLUNK_API_KEY, and reCAPTCHA keys.

**Start the server:**
```bash
# Start Redis first (port = server port + 383)
redis-server                        # port 6379 for stable
redis-server --port 6381            # port 6381 for beta

# Run server
node server/graderoom.js            # port 5996 (stable) or 5998 (beta)
```

Access at `localhost:<port>`. Default admin account: `admin` / `Pa5sw0rd`.

**Stable vs Beta** is determined solely by port number: 5996 = stable, anything else = beta. This affects which MongoDB database is used and which Redis port is connected.

## Testing

Tests run automatically on server startup in non-production mode (`NODE_ENV !== "production"`). If any test fails, the server exits. Tests are in `server/dbTests.js` using Node's built-in `assert` module.

```bash
npm run scrape_test   # Test web scraping
npm run email_test    # Test email sending
```

## Architecture

**Stack:** Express.js + EJS server-side rendering, MongoDB, Redis (sessions), Socket.io (real-time), Python (web scraping)

**Entry point:** `server/graderoom.js` — initializes Express, connects to MongoDB, sets up Redis sessions, runs tests (non-prod), then starts listening.

### Key Server Files

- `server/routes.js` — All Express route handlers (HTTP endpoints)
- `server/socket.js` — Socket.io event handlers (real-time grade sync, settings changes)
- `server/sockets.js` + `server/socketManager.js` — Socket.io setup and utilities
- `server/dbClient.js` — MongoDB abstraction layer; all database operations go through here
- `server/dbHelpers.js` — Database constants, schema versions, validation functions, utility helpers
- `server/enums.js` — Shared constants (schools, sync statuses, themes, class types)
- `server/middleware.js` — Express middleware (rate limiting by user tier, auth checks)
- `server/passport.js` — Passport.js local strategy configuration
- `server/scrape.js` — Node.js interface to the Python scraper
- `server/scrape.py` — Main Python web scraper (Powerschool login + grade extraction)
- `server/emailSender.js` — Email via Plunk API

### Database Structure

MongoDB with four logical databases:
- **stable** / **beta** — Per-environment user data (selected by port)
- **test** — Used by `dbTests.js` during startup
- **common** — Shared across environments (course catalog, etc.)

Schema versions are tracked (`dbUserVersion`, `dbClassVersion` in `dbHelpers.js`). On startup, `mongo.updateAllUsers()` and `mongo.updateAllClasses()` run migrations to bring documents up to the current version.

### Request Flow

Two parallel communication paths:
1. **HTTP:** Browser → Express routes (`routes.js`) → `dbClient.js` → MongoDB → EJS-rendered response
2. **Socket.io:** Browser → Socket events (`socket.js`) → `dbClient.js` → MongoDB → Socket emit back

Grade syncing uses the Socket.io path. For Bellarmine, a browser extension on the client scrapes Powerschool and sends grade data to the server via socket. For other schools, the server spawns the Python scraper directly.

Bellarmine has no sync card. Its sync UI is `#syncControl`, a chip first in the navbar row
(left of More), driven by `public/js/sync_control.js`.

- States set `data-state`: `waiting`, `ready`, `syncing`, `login`, `awaiting`, `install`,
  `installed`, `reload`, `unsupported`, `error`. Clickable: `ready`, `login`, `awaiting`,
  `install`, `reload`, `error`. `STICKY_STATES` is a separate list of states that hold until
  something resolves them — `syncControl(null)` will not clear one, `syncReset()` will.
- `--progress` (registered) fills the interior left to right during a sync, from the extension's
  `status` messages via `syncStatus()`; those messages are also the sub-line. The wait until the
  next sync is text only.
- `fitSyncControl()` pins an explicit px width so it can animate, and refits once per state, so
  status messages ellipsize rather than resize the chip. The nav row is `justify-content: end`,
  so the chip grows leftward and the buttons after it do not move.
- `.updateGradesMessage` is a last-synced + change-count readout only; `setupLastUpdated()` in
  `sync_grades_card.js` is its sole writer for Bellarmine. `syncMessage()` / `syncFailed()` in
  `authorized_index.js` route status and failures to the chip. Other schools keep the old pill
  behaviour through the same two helpers.
- After the store opens, `watchForInstall()` polls for the extension and syncs on its own once
  it appears. Firefox cannot detect it without a page load, so it gets the `reload` state.
- Auto-sync is attempted after every `info-initialstatus` via `maybeAutoSync()`, gated on
  `autoSyncDue()`. Extension 1.7.0+ reports a
  PowerSchool login from a content script on `powerschool.bcp.org/guardian/*` over the existing
  external port; a `.closed` poll on the login popup is the fallback.
- Sessions are rolling: `sessionIdlePeriod` (8h) of inactivity, or `sessionRememberPeriod` (30d) with
  the login page's Stay signed in box. The extension holds the PowerSchool credentials, not the server.

### Frontend

No build pipeline. EJS templates in `views/` with inline JavaScript. Static assets served from `public/`.

- `views/user/` — Authenticated pages (grades dashboard, settings)
- `views/viewer/` — Public/login pages
- `views/admin/` — Admin panel
- `views/partials/` — Reusable EJS components

**CSS architecture:** Component-based files in `public/css/` with theme-specific variable overrides in `public/css/themes/<theme>/index.css`. Themes only contain CSS custom property definitions (`:root {}` variable blocks); all structural CSS lives in the component files.

**CSS file load order** (theme file loads first via server-side EJS `id="pageStyle"` link):

1. Theme file (`themes/<theme>/index.css`) — `:root {}` variable definitions only
2. `base.css` — keyframes, scrollbar, html/body, loading spinners, utility classes
3. `nav.css` — navbar, classLinks, dropdown, secondary nav
4. `forms.css` — buttons, form inputs, selects, sliders, range pickers
5. `tables.css` — tables, class tables, toolTab, weights, GPA details
6. `notifications.css` — notification panel, cards, pinned/dismissed
7. `layout.css` — term switcher, GPA container, backToHome, mobile grid
8. `components.css` — cards, tabs, charts, changelog, popups, add-assignment, grade-changes, donation, premium labels
9. `responsive.css` — `@media` breakpoint rules

Additional CSS: `blur.css`, `responsive_blur.css`, `theme_backgrounds.css`, `fade.css`, `reduce_motion.css`, seasonal files (`april_fools.css`, `christmas_lights.css`).

**CSS variable convention:** All theme variables use `--clr-*` prefix (e.g., `--clr-bg`, `--clr-surface`, `--clr-text`, `--clr-btn`). Image URLs use `--img-*`, decorations use `--deco-*`. New component CSS must use these variables — never hard-code colors that differ between themes.

### User Tiers & Rate Limiting

Users have tiers (free, donor, plus, premium) that affect:
- Rate limits (30/40/60/100 req/min)
- Minimum sync intervals (4h/2h/1h/15min), the only thing the server gates on
  (`nextSyncAllowed()` / `nextSyncWhen()` in `dbHelpers.js`).
- `syncPeriod` (Settings > Advanced > PowerSchool Sync Settings, default 4h) is the user's
  auto-sync preference. `effectiveSyncPeriod()` = `max(tier minimum, syncPeriod)`, rendered as
  `syncInterval`; the tier minimum is rendered as `syncMinInterval`. The chip is clickable on
  `syncMinInterval`; its sub-line reads `syncMinInterval` while waiting ("Auto in 2h" when an
  auto-sync fires at the end of it, "Available in 2h" otherwise) and `syncInterval` once
  clickable ("Auto in 4h").
- `sync-limit` calls `syncBlocked(timestamp)`, pinning the chip to the server's deadline.
- `syncPeriod` must be in the `deserializeUser` projection in `passport.js` to reach a render.
- Theme access:
  - **Free:** dark, light, oled-dark
  - **Plus:** midnight-blue, forest, rose, solarized-light, terminal
  - **Premium:** nord, dracula, monokai, gruvbox, cyberpunk, catppuccin-latte, sunset, one-light, github-light, ayu-light
- Background access:
  - **Free:** default, winter-logo
  - **Plus:** aurora, blueprint
  - **Premium:** nebula, hologlass

Each theme has background-specific CSS overrides in `public/css/themes/<theme>/backgrounds/<background>.css`.

## Conventions

- On Windows, use `python` not `python3`.
- School identifiers use multiple formats: enum keys (`BELL`, `BISV`, `NDSJ`), internal values (`bellarmine`, `basis`, `ndsj`), and abbreviations (`BCP`, `BISV`, `NDSJ`). Mapping is in `server/enums.js`.
- The `isBetaServer` flag (derived from port) controls environment-specific behavior throughout the codebase.
