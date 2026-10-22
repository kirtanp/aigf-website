# AI Governance Forum website

The website of the [AI Governance Forum](https://ai-gf.com), organised by the AI Transparency Institute. It is a static site built with [Astro](https://astro.build) and Tailwind CSS. All content (speakers, editions, pages, settings) is plain Markdown and YAML in `src/content/`.

There are two ways to run it on your computer. Neither needs a database or an API key.

## Option A: Node and just

1. Install [Node.js](https://nodejs.org) 22 or newer, and [just](https://just.systems) (`brew install just` on macOS, `winget install Casey.Just` on Windows).
2. Get the code and start the site:
   ```sh
   git clone <repository-url> aigf-website
   cd aigf-website
   just setup
   just dev
   ```
3. Open http://localhost:4321. Pages reload as you edit files in `src/`.

You can also skip just and use npm directly: `npm ci`, then `npm run dev`.

## Option B: Docker

1. Install and start [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. From the project folder, run:
   ```sh
   docker compose up --build
   ```
3. Open http://localhost:4321. Edits in `src/` and `public/` reload the page. Stop with Ctrl+C.

To see the production build instead (what visitors get), run `docker compose --profile preview up --build preview` and open http://localhost:4322.

## Recipes

Run `just` to list them all.

| Recipe | What it does |
|---|---|
| `just setup` | Installs dependencies (`npm ci`). |
| `just dev` | Dev server with live reload on port 4321. |
| `just build` | Builds the static site into `dist/`. The build also validates all content, so a bad edit fails here. |
| `just preview` | Builds, then serves the production site on port 4321. |
| `just check` | Type check plus build. This must pass before a deploy. |
| `just shots [paths]` | Desktop and mobile screenshots into `screenshots/` (default: `/` and `/speakers`), e.g. `just shots / /about`. Downloads Chromium the first time. |
| `just docker` | Same as `docker compose up --build`. |
| `just docker-preview` | Production build in Docker on port 4322. |
| `just migrate` | Regenerates `src/content/` from the WordPress snapshot. See below. |
| `just clean` | Deletes `dist/`, `.astro/` and `screenshots/`. |

## Where things are

- `src/content/`: all content. Editors change it through Pages CMS (forms defined in `.pages.yml`); see `EDITING.md`.
- `src/pages/`, `src/components/`, `src/layouts/`: templates. All design decisions live here, never in content.
- `src/styles/global.css`: brand colours, type scale and shared utilities.
- `scripts/migrate/`: the one-shot import from the old WordPress sites. It reads `archive-raw/`, a 469 MB snapshot that is not in the repository.
- `public/_redirects`, `public/_headers`: Cloudflare Pages redirects from the old WordPress URLs, and response headers.
- `DEPLOY.md`: putting the site online (GitHub, Cloudflare Pages, Pages CMS, domain).
- `PLAN.md`: goals, decisions and build progress. `CLAUDE.md`: notes for working on the code.

## Troubleshooting

- **Port 4321 is in use:** `PORT=4400 just dev`, or `PORT=4400 docker compose up` for Docker.
- **`just: command not found`:** install just (see Option A), or use the npm commands.
- **Build fails with a content error:** the message names the file and field. A required field is empty or a URL doesn't start with `https://`.
- **`just migrate` warning:** never run the migration once editors use the CMS. It deletes and rewrites `src/content/`, which would erase their edits.
