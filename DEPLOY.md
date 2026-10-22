# Deploying the site

Everything below is on free plans with no card. Do it once; after that, every save in the CMS (or `git push`) redeploys the site by itself in 1 to 2 minutes.

**Before you start, confirm** who controls the `ai-gf.com` registrar login and DNS. You need access to both for step 4.

## 1. GitHub repository

1. Create a free GitHub **organisation** for AITI (not a personal account), so access survives staff changes.
2. Create a **private** repository in it, e.g. `aigf-website`, and push this folder:
   ```sh
   git init && git add -A && git commit -m "AI Governance Forum website"
   git remote add origin git@github.com:<org>/aigf-website.git
   git push -u origin main
   ```
   `archive-raw/` and the WordPress export are git-ignored on purpose. Keep a copy of `archive-raw/` (469 MB) on AITI's shared drive. It is the only full backup of the old sites.
3. The workflow in `.github/workflows/check.yml` starts running on every push. It type-checks the site, builds it, and checks links.

## 2. Cloudflare Pages

1. Create a free Cloudflare account (or use AITI's), then go to **Workers & Pages → Create → Pages → Connect to Git**, and pick the repository.
2. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - The Node version comes from `.node-version` (24).
3. Deploy. The site appears at `<project>.pages.dev`. Check it there before touching DNS.
4. **Web Analytics:** in the Pages project, go to **Metrics → Web Analytics → Enable**. It is cookieless, so no cookie banner is needed.

`public/_redirects` (old `/index.php/...` URLs → new pages) and `public/_headers` are applied automatically.

## 3. Pages CMS

1. Go to https://app.pagescms.org, sign in with GitHub, and install the Pages CMS GitHub app on the AITI organisation, giving it access to the repository only.
2. Open the repository. Pages CMS reads `.pages.yml` and shows the forms.
3. Test the five tasks in `EDITING.md` once, end to end: change something, save, and check that it appears on `<project>.pages.dev` after about 2 minutes. Then undo it.
4. Invite the editors: **Collaborators → Invite a collaborator** (by email; they need no GitHub account). Technical editors join the GitHub organisation instead.
5. Add the screenshots to `EDITING.md` (see the note at its top).

## 4. Domain (phase 1, mid-November)

1. In Cloudflare, **add the site `ai-gf.com`** (free plan) and change the nameservers at the registrar to the two Cloudflare gives you. Cloudflare imports the existing DNS records first, so the old year subdomains keep working.
2. In the Pages project: **Custom domains → Set up a domain →** `ai-gf.com`, then again for `www.ai-gf.com`.
3. Make `www` redirect to the bare domain: **Rules → Redirect Rules**, `www.ai-gf.com/*` → `https://ai-gf.com/${1}` (301).
4. Check: https://ai-gf.com shows the new site, and `https://ai-gf.com/index.php/about/` redirects to `/about`.

## 5. Old year sites (phase 2, after the event)

Every page of 2019–2025.ai-gf.com now has a home at `/editions/<year>`, and `archive-raw/` holds a full snapshot.

1. For each year, add a redirect: **Rules → Redirect Rules → Create rule**, *Hostname equals* `2025.ai-gf.com` → static URL `https://ai-gf.com/editions/2025`, 301. That makes seven rules; check that the free plan's rule limit shown in the dashboard covers them, or use one **Bulk Redirect** list instead.
2. The subdomains' DNS records must stay **proxied** (orange cloud) for the rules to apply. Once WordPress is gone, point them at `100::` (AAAA, proxied), a placeholder address that is never reached.
3. Then shut down the WordPress installs and cancel their hosting. Unpatched WordPress is a security risk.

## Things to keep in mind

- **Cloudflare Pages has a 25 MB limit per file.** The 2020 talk video (`Pierre-Paperon-Governance-of-AI.mp4`, 40 MB) is still linked from the old 2020 site. Before phase 2, upload it to YouTube or Vimeo and replace the link in **Editions → 2020 → Schedule**.
- Do not run `just migrate` once editors use the CMS. It would overwrite their changes.
