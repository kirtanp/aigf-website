# AI Governance Forum website. Run `just` to list recipes.

port := env("PORT", "4321")

# List recipes
default:
    @just --list

# Install dependencies (Node 22 or newer)
setup:
    @node -e "const [maj] = process.versions.node.split('.'); if (maj < 22) { console.error('Node 22 or newer is required, found ' + process.version); process.exit(1) }"
    npm ci

# Start the dev server with live reload on http://localhost:4321
dev: _deps
    npx astro dev --port {{port}}

# Build the static site into dist/ (also validates all content)
build: _deps
    npm run build

# Build, then serve the production site on http://localhost:4321
preview: build
    npx astro preview --port {{port}}

# Type check and build: what must pass before a deploy
check: _deps
    npx astro check
    npm run build

# Desktop and mobile screenshots into screenshots/ (default: home and speakers)
shots *paths: build
    #!/usr/bin/env bash
    set -euo pipefail
    npx playwright install chromium
    npx astro preview --port 4399 > /dev/null 2>&1 &
    trap "kill $! 2>/dev/null" EXIT
    for _ in $(seq 50); do curl -sf -o /dev/null http://localhost:4399 && break; sleep 0.2; done
    node scripts/screenshots.mjs http://localhost:4399 {{paths}}

# Regenerate src/content from archive-raw/. Never run once editors use the CMS.
migrate:
    @echo "This deletes and rewrites src/content/. Ctrl+C to stop, Enter to continue."
    @read _
    npm run migrate -- --force

# Run the dev server in Docker (no local Node needed) on http://localhost:4321
docker:
    docker compose up --build

# Build and serve the production site in Docker on http://localhost:4322
docker-preview:
    docker compose --profile preview up --build preview

# Remove build output and caches
clean:
    rm -rf dist .astro screenshots

_deps:
    @test -d node_modules || npm ci
