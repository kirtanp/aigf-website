# AI Governance Forum website rebuild: plan and context

Use this file as context for the build session. See "Progress" right below for where things stand, and `CLAUDE.md` for how the code is organised.

## Progress (updated 22 Oct 2026)

**Done**
- **Snapshot** of ai-gf.com and 2019–2025.ai-gf.com in `archive-raw/` (REST JSON, all 436 media originals, wget mirror, SHA256SUMS). The Wayback Machine check was dropped: the local snapshot is the fallback.
- **Build step 1, migration** (`scripts/migrate/`): 101 speakers (all with photos), 7 past editions with schedules and per-year appearances, pages, settings, logos, 2025 slide PDFs. `REVIEW.csv` was answered as follows. Missing organisations were looked up online (all 11 filled). Auto-split titles and organisations are accepted as they are. Low-resolution photos stay as they are ("no need to do better than the old sites"). Unused photos are ignored. Four name-spelling rows are unanswered, so the proposals stand.
- **Build step 2, scaffold**: Astro 5 + Tailwind 4, brand tokens, Inter via Fontsource, Zod schemas for every collection, layout, header and footer, and every route. These are working pages with basic styling, not the final design. `npm run build` produces 117 pages; `astro check` reports 0 errors.

- **Local setup** (22 Oct): `justfile` (setup, dev, build, preview, check, shots, docker, migrate, clean), `Dockerfile` + `docker-compose.yml` (dev server with live reload; `preview` profile serves the build), `README.md`. Both Docker modes tested. `just shots` takes Playwright screenshots into `screenshots/`.
- **Build step 3, design checkpoint: approved by the user (22 Oct).** Direction: lean, professional, modern. Inset rounded hero on the deep gradient with concentric-ring decoration (no imagery), the date as the second-largest element, a venue/time/format/countdown row, editorial 12-column sections, numbered theme tiles, 4:5 greyscale speaker cards, past editions as a ruled list, closing call-to-action band. Until 2026 speakers are announced, Home shows the latest past edition's speakers.
- **Build steps 4–5, pages and components** (22 Oct): every route uses the same system (`PageHeader`, `SectionHeading`, `Facts`/`EventFacts`, `Newsletter`, redesigned `Schedule` with speaker avatars and indented talks). Programme: facts, speakers once added, schedule once "Programme published", otherwise "Programme coming soon" + updates block + past programmes. Editions index as a timeline with speaker avatars; edition pages with summary, speakers (role at the time), programme, photos, previous/next. Speaker profiles with appearances and "Also at the <year> edition". Pages and 404 restyled. Stress-tested: 2 speakers, no photo, very long name, registration/livestream on, a published 2026 schedule with an uploaded slide.
  - **Decision:** past edition logos are not shown (2019's is white-only and invisible on white; 2020–22 have opaque backgrounds; styles differ). The year in large type stands in. Files and `logo` fields are kept.
  - **Decision:** the "original site" link on edition pages was dropped, since phase 2 redirects those subdomains to the edition pages.
  - Migration fixes: bio slide links now point to local `/files/` copies; bracketed "[Slides]" wrappers, Outlook safelinks, `www.` links glued to the old site's URL, and garbled hrefs are cleaned.
- **Build step 6, CMS** (22 Oct): `.pages.yml` with labels and hints for every field, validated against Pages CMS's own config schema (from its source). Saves were simulated with Pages CMS's own parse/sanitize/merge/stringify code on every content file: the rebuilt HTML is byte-identical. Speaker references are stored as `slug.md` (what Pages CMS writes); schedule links take an uploaded file or a URL. `EDITING.md` written. **Still to do (needs the GitHub repo):** connect Pages CMS, test the five tasks live, invite editors, add screenshots to `EDITING.md`.
- **Build step 7, SEO and redirects** (22 Oct): sitemap, canonical, OG/Twitter tags, generated `/og.png` (wordmark on gradient), speaker photos as OG images, `Event` JSON-LD on Home and Programme from settings, `robots.txt`, `_headers`, `_redirects` for every old `/index.php/...` URL and the two old PDF URLs. Subdomain redirects (phase 2) are documented in `DEPLOY.md` as Cloudflare Redirect Rules.
- **Build step 8, QA** (22 Oct): axe-core (WCAG 2.2 AA + best practice) on 13 pages at desktop and mobile: 0 violations. Pixel-measured contrast of white text on the gradient panels: all pass after making all text there pure white. Keyboard: skip link first, visible focus, mobile menu opens with Enter. Lighthouse (mobile): 99–100 in performance, accessibility, best practices and SEO. Links: 0 broken internal (lychee, in Docker); `.github/workflows/check.yml` runs check, build and lychee on every push and weekly.
  - Dead external links left in old bios (third-party sites gone): editionsthemis.com and press.uottawa.ca (Benyekhlef), thibaultschrepel.com/en/ (Schrepel), the Springer call-for-papers update page (journal call). Several others return 403/500 to bots only.

**Written by Claude, not yet reviewed by the user**: the edition summaries (in `scripts/migrate/editions-meta.mjs`; 2023 uses its own home-page text), the three 2026 theme descriptions and the hero tagline (in `settings/home.yaml`), and the organiser summary and missions (in `settings/site.yaml`). All are set in `migrate.mjs`.

**Next: build step 9, deploy**, following `DEPLOY.md`. It needs the user: an AITI GitHub organisation, a Cloudflare account, and the `ai-gf.com` registrar/DNS login. Then finish step 6 live (Pages CMS connection, editor invites, `EDITING.md` screenshots). Before phase 2: re-host the 40 MB 2020 video (over Cloudflare's 25 MB file limit) on YouTube or Vimeo.

## Goal
Rebuild https://ai-gf.com (AI Governance Forum, run by the AI Transparency Institute) with a cleaner, more professional design. Inspiration for the *type* of site: https://www.swissaisummit.com/. The Institute site (aitransparencyinstitute.com) was given **only as a colour reference**. The design is from scratch and does not need to match it.

**Second goal: non-developers must be able to update the site** (change the event date, add a speaker, publish the programme, set the registration link) through a web form, without touching code, git or the terminal. 2 to 3 people will edit, with varying technical skill.

**Hard constraints, in priority order:**
1. **Free to run and manage.** Every service must be on a free tier with no card required. The only recurring cost is the existing domain renewal.
2. **It looks good.** Design quality is not negotiable (see "Design quality bar").

## Timeline (drives priorities)
Today is 22 Oct 2026 and the 8th edition is on **17 Dec 2026**, about 8 weeks away. The site exists mainly to drive registrations, so it should be live by **mid-November**. Ship in two phases:
- **Phase 1 (launch, mid-Nov):** Home, 2026 edition/Programme page, About/Organizer, Guiding Principles, Contact, CMS editing, redirects for the main domain. Past-editions timeline on Home links to the existing year subdomains for now.
- **Phase 2 (after launch, before or after the event):** full archive migration (speaker profiles, edition pages 2019 to 2025), subdomain redirects, decommission old WordPress sites.

## Decisions already made
- **Language:** English only.
- **Registration:** paid event; link not available yet, so launch with a "Registration link coming soon" placeholder.
- **Contact:** contact@aitransparencyinstitute.com.
- **Speaker photos:** reuse all existing photos from the old sites (confirmed).
- **Homepage:** 3 themes for 2026 (AI safety, Trust and transparency, Sustainability); optional stats line ("7 past editions", speaker count).
- **Logos:** use the existing logos only (PNGs in the WordPress export under `uploads/2021` to `uploads/2026`; the 2026 one is `Logo-2026.001.png`). No new logo work. Many "cropped-*" duplicates exist, so pick the best-resolution original of each.
- **Donate page:** skipped for now. Do not build it or link it. (The old one was a private stub with 25/50/75/100 CHF buttons.)
- **Legal pages:** keep it as before, which means **none**. The old site never published a privacy policy (only WordPress's default text as an unpublished draft) and had no legal notice. Drop the Complianz cookie banner; the new site sets no cookies, so it needs no banner.
- **Fonts:** none specified, so default to Inter (self-hosted via Fontsource, not Google Fonts, to avoid sending visitor IPs to Google).
- **2026 content:** placeholders are fine at launch (see "Open items").

## Brand
- Primary blue `#3C0AFF`
- Secondary magenta `#FF2080`
- Text dark grey `#222222`
- Gradient: `linear-gradient(90deg, #3C0AFF 0%, #FF2080 100%)`. Use it sparingly: hero, primary buttons, thin accents and dividers.
- Tone: calm, editorial, institutional, lots of whitespace. Subtle motion only (fade-ins), respecting `prefers-reduced-motion`.
- **Contrast check (already computed):** white on `#3C0AFF` is about 7.8:1 (passes AA). White on `#FF2080` is about 3.6:1, which **fails AA for normal text** and passes only for large/bold text (18px bold or 24px+). So white text on the gradient must be large/bold, or the gradient's magenta end must sit behind no text (e.g. button text centred over the blue half, or use a darker magenta stop such as `#D6006A` for text-bearing surfaces).

## Recommended stack (all free)
| Layer | Choice | Cost |
|---|---|---|
| Framework | **Astro** + Tailwind CSS, fully static output | free, open source |
| Content | Astro content collections: Markdown (plain, **no MDX**, so the CMS can edit it) and YAML | free |
| **Editing (CMS)** | **Pages CMS** (pagescms.org): hosted, open source, git-based. Needs only a `.pages.yml` config in the repo. Technical editors log in with GitHub; less technical editors can be invited by email from inside Pages CMS (no GitHub account needed; confirm during setup). Fallback: **Sveltia CMS** at `/admin` (also free, needs a small Cloudflare Worker for login). | free |
| Hosting | **Cloudflare Pages**: unlimited bandwidth, 500 builds/month (far above need), preview URLs | free |
| Repo | Private GitHub repo in a free GitHub organisation owned by AITI (not a personal account), so access survives staff changes | free |
| Registration | The event is **paid**. Link out to whatever ticketing page AITI sets up (Eventbrite, Luma or similar take a per-ticket fee, which can be passed to the buyer; no subscription). Do not build checkout. **At launch: no link.** The Register button is replaced by a "Registration link coming soon" placeholder until an editor pastes the URL into Site settings. | free to manage |
| Newsletter | **Brevo** free plan (unlimited contacts, 300 emails/day) signup form. Alternatives: MailerLite free (500 subscribers), Buttondown free (100). Use whatever list AITI already has, if any. | free |
| Contact | `mailto:contact@aitransparencyinstitute.com` (Contact page and footer; stored in Site settings). No contact form at launch, which avoids another service and spam. | free |
| Analytics | **Cloudflare Web Analytics** (cookieless, built into Pages). Not Plausible, which is paid. | free |
| Fonts | Inter, self-hosted via Fontsource | free |
| Images | Astro `<Image>` optimisation (WebP/AVIF) | free |

## Design quality bar
"Looks good" is a requirement, so treat it like one:
- **Design first, content second.** Before wiring real data, build the Home page and a speaker grid with real 2025 content and review screenshots (desktop and mobile) with the user. Only then build the rest.
- **Consistent speaker photos.** The source photos vary wildly (sizes, crops, backgrounds, quality). Normalise them in templates: same aspect ratio (4:5), `object-fit: cover` with face-centred cropping, a uniform treatment (e.g. subtle greyscale that turns to colour on hover, or a light brand-tinted duotone). Speakers without a photo get a tasteful initials tile, not a broken image or generic silhouette.
- **No stock imagery.** Drop the Freepik hero. Use the gradient, typography and real event photos (2024/2025 Lausanne, if any exist) instead.
- **Typographic system:** one family (Inter), a fixed type scale, generous line height, a max text width of about 70 characters, one accent colour per section.
- **Reference check:** compare against swissaisummit.com side by side at the review step: spacing, hierarchy, and how the hero sells the date and the Register action.
- **Editor-proof:** templates must still look right with long names, missing photos, 2 speakers or 30, and empty programmes, since editors will not adjust layout.

## Editing workflow (beginner friendliness)
Design the content so the **common tasks are one form each**:

| Task | Where in the CMS | Fields |
|---|---|---|
| Change event date, venue, format, registration/livestream links, "registration open" toggle | **Site settings → Current edition** (single file `src/content/settings/current.yaml`) | date, time, venue, city, format (in person / hybrid / online), registerUrl, livestreamUrl, registrationOpen, programmePublished |
| Add or edit a speaker | **Speakers** (one Markdown file per person) | name, title, organisation, photo (upload), links, bio (rich text) |
| Publish the programme | **Editions → 2026** | schedule list (time, title, speaker picker, description) |
| Edit About, Principles, Contact text | **Pages** | title, body (rich text) |
| Homepage themes and intro | **Site settings → Home** | intro text, themes list (title, short text), show stats (on/off) |

Rules that keep it beginner friendly:
- No layout or styling decisions in content. Editors fill fields; templates decide how it looks.
- Every field has a label and a one-line hint in `.pages.yml` (e.g. "Use the full ticket page URL, starting with https://").
- Required fields and formats are validated by Astro's Zod schemas, so a bad edit fails the preview build instead of breaking the live site.
- Empty states are handled in templates: no programme yet shows "Programme coming soon"; an empty `registerUrl` shows a muted, non-clickable "Registration link coming soon" placeholder in place of the Register button (hero, 2026 page, header CTA). Pasting the URL in Site settings switches all of them to live buttons.
- Photos are uploaded through the CMS into one `src/assets/speakers/` folder; Astro resizes them, so editors do not need to crop or compress.
- Saving in the CMS commits to GitHub and Cloudflare redeploys in about 1 to 2 minutes. With 2 to 3 editors, no branch-based review workflow; it would confuse the less technical editors.
- Instead, speakers and pages get a **"Published" toggle** (`draft: true` hides it from the live site). Editors can prepare a speaker or the programme in advance and flip it on when ready.
- Nothing is ever truly lost: every save is a git commit. The more technical editor can revert in GitHub; the others just ask.
- Deliverable: **`EDITING.md`**, a short illustrated guide (screenshots) covering: logging in, the five tasks above, the Published toggle, how long changes take to appear, and who to ask if something looks wrong.
- Access: technical editors get a free GitHub account added to the AITI organisation; others are invited by email in Pages CMS. That is the only setup they do.

## Why the current site needs replacing
WordPress with Twenty Twenty-One. Problems seen on ai-gf.com: no call to action, logo and nav duplicated, the title repeated, a cookie banner showing raw `{title}` / `{vendor_count}` placeholders, a raw tracking URL as the image credit, `index.php/` in URLs, stock Freepik hero, typos ("adresses"), and overlapping About/Organizer pages (merge into one page).

## Source data (all content must be migrated)
### 1. WordPress export in this folder
`aigovernanceforum03926.WordPress.2026-10-22.xml`. It holds 22 pages, 57 media items and 1 post. Useful content:
- Home (2026, 8th edition, **17 Dec 2026**, Swiss Institute of Comparative Law, Lausanne University, hybrid)
- About Us, Organizer (AI Transparency Institute: missions Education, Legal Watch, Research)
- Guiding Principles
- Previous Editions (2019 Geneva, 2020 virtual, 2021 virtual, 2022 virtual, 2023 virtual, 2024 Lausanne, 2025 Lausanne, with dates)
- **2025** schedule (10 Dec 2025, 14:00-17:00 CET) and 11 speaker bio pages with photos/slides
- AI & Ethics Journal call for papers (Springer; deadline March 2023, so outdated, archive only)
- Two PDFs (2025 slides, "The EU approach to AI Governance")
- **Junk to drop:** Sample Page, Hello World, empty Blog, template Contact page, WordPress theme/global-style entries.
- The export has **no** speaker text for 2024 and earlier, only orphaned photos, so use the per-edition sites below.

### 2. Old edition sites (live, WordPress, REST API open)
`https://<year>.ai-gf.com/` for 2019 to 2025. Pull structured data from:
- `https://<year>.ai-gf.com/index.php?rest_route=/wp/v2/pages&per_page=100`
- `https://<year>.ai-gf.com/index.php?rest_route=/wp/v2/media&per_page=100`

What each has (verified):
| Year | Speakers | Photos | Bios | Schedule |
|---|---|---|---|---|
| 2025 | 11 | yes | full bio pages | yes |
| 2024 | about 10 | yes | full bio pages | yes |
| 2023 | 8 | yes | only 2 bio pages | yes (with talk titles) |
| 2022 | 16 | yes | about 16 bio pages | yes |
| 2021 | list plus 6 | yes | 6 bios | yes |
| 2020 | about 30 (name + affiliation) | yes | none | yes |
| 2019 | about 17 (name, role, city) | yes | none | yes |

Also present: Guiding Principles (2022 to 2025), Organizers pages, journal call (2022 to 2025), and for 2019 Sponsor, Tickets and Brocher Foundation pages. Ignore 2019 Themeum demo pages and WooCommerce/Stripe stubs. Speaker list pages hold the photos. Bio detail lives in child pages (parent = Speakers page). 2019 and 2020 speakers are on a single page, not child pages.

**Before any redirect or shutdown, take a full static snapshot** of each year site (raw REST JSON plus `wget --mirror` HTML and media) into a separate `archive-raw/` folder outside the site source, and check each is in the Wayback Machine. That is the fallback if migration misses something.

## Content model
- `settings/current.yaml`: the current edition's logistics (see editing table). Single source of truth for hero, Register button and countdown.
- `editions/<year>.yaml`: date, venue/format, summary, schedule (items reference speaker slugs), slides/PDFs, photos, and **per-appearance speaker data** (`speaker`, `roleAtTheTime`, `organisationAtTheTime`, `talkTitle`), because organisations change between years.
- `speakers/<slug>.md`: name, current title, **organisation** (important; shown on every speaker card), bio, photo, links. No country field. "Editions spoken at" is **computed** from edition files, not stored, so editors cannot get it out of sync.
- Recurring people (e.g. Sebastian Hallensleben, Raja Chatila, Karine Perset, Marion Ho-Dac, Martin Jaggi, Kai Zenner, Joanna Bryson): one profile per person; uncertain matches go into the review list.
- `pages/*.md`: About (merged with Organizer), Guiding Principles, Contact, Journal call (archived).

## Site structure
**Home:** hero (2026 date, venue, hybrid; primary **Register**, secondary **Watch online**, both driven by settings), short intro, featured speakers (or "Programme coming soon" placeholder with newsletter signup), **3 themes tiles for 2026: AI safety, Trust and transparency, Sustainability** (one line each, drafted from the existing mission text, editable in the CMS; the list can change per year), an **optional, low-key stats line** ("7 past editions", "N speakers", computed at build time and hidden by a toggle in settings; not a design centrepiece), past-editions timeline 2019 to 2025, organiser block, newsletter, footer.

**Pages:** Programme (2026 placeholder, links to past schedules), Speakers (grid with year filter, profile per person), Editions (index plus one page per year), Guiding Principles, About, Contact.

**Footer:** only real links. The old footer and social menu were WordPress placeholders (facebook.com/wordpress, twitter.com/wordpress, `wordpress@example.com`, "Designed with WordPress"). Add AITI's real social profiles only if they exist.

**SEO extras:** `Event` structured data (JSON-LD) on Home and the 2026 page, generated from settings, so Google can show the date and venue. OG image per page (default: logo on gradient).

## Build steps
1. **Migration script** (Node or Python, kept in `scripts/migrate/`, not in the site source): pull the 7 edition sites via REST API, parse the WP export, normalise to the content model, download and optimise images (rename messy files such as `IMG_9434.jpeg`, `曾憲立.png.jpeg` to `<speaker-slug>.jpg`), merge duplicate speakers, fix typos/clean HTML to plain Markdown. Output a **`REVIEW.csv`** (uncertain merges, unidentified photos, missing organisations) that a non-developer can fill in a spreadsheet, and have the script re-read it.
   - **The migration is one-shot.** Once editors start using the CMS, never re-run it over `src/content/`, or it will overwrite their edits. Add a guard (refuse to run if content already exists unless `--force`).
2. **Scaffold Astro + Tailwind**, brand tokens, layout, header/footer, responsive grid, Zod schemas for every collection.
3. **Design checkpoint:** Home and speaker grid with real 2025 content; screenshots reviewed with the user before going further.
4. **Build pages and components** (hero, speaker card, schedule, timeline, edition page, newsletter, empty states).
5. **Wire content collections** to the migrated data.
6. **CMS:** write `.pages.yml` mirroring the schemas with labels/hints; test each editing task end to end as a non-developer would; write `EDITING.md`.
7. **SEO and redirects:** sitemap, meta/OG tags, JSON-LD, Cloudflare `_redirects` from old URLs (`/index.php/...`) to new paths. Phase 2: redirect `<year>.ai-gf.com/*` to `/editions/<year>` (recommended, after the snapshot), then shut down the old WordPress installs (unpatched WordPress is a security liability).
8. **QA:** mobile, accessibility (contrast, keyboard nav, alt text on speaker photos), Lighthouse, broken links (`lychee`, run locally or in free GitHub Actions).
9. **Deploy** to Cloudflare Pages, then point DNS. Confirm beforehand who controls the `ai-gf.com` DNS and registrar login.

## Open items (need an answer from the user)
- **2026 programme, speakers, registration and livestream links** are not published yet. Launch with placeholders and fill via the CMS.
- **Existing newsletter list?** If AITI already has one (e.g. Mailchimp), reuse it instead of Brevo.
- Some 2024 and 2023 photos have unclear filenames; resolve via `REVIEW.csv`.
- 2023 and earlier mostly have names, organisations and photos only, so archive pages will be lighter than 2024 and 2025. That is expected.

## Later (not now)
- Donate page (old stub had 25/50/75/100 CHF). When revived, Stripe Payment Links is free to set up (fees per transaction only) and supports TWINT.
- Privacy policy / legal notice, if AITI decides it wants them. Worth reconsidering if the newsletter signup is added, since that collects email addresses.
