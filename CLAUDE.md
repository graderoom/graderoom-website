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

Access at `127.0.0.1:<port>`. Default admin account: `admin` / `Pa5sw0rd`.

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
- Sync intervals (4h/2h/1h/15min)
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
