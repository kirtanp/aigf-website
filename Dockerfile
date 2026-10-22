# Local development without installing Node. See README.md.
#   docker compose up --build                        dev server, live reload
#   docker compose --profile preview up --build      production build
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS dev
COPY . .
EXPOSE 4321
CMD ["npx", "astro", "dev", "--host", "0.0.0.0", "--port", "4321"]

FROM deps AS preview
COPY . .
RUN npm run build
EXPOSE 4321
CMD ["npx", "astro", "preview", "--host", "0.0.0.0", "--port", "4321"]
