# Content migration (one-shot)

Turns the WordPress snapshot in `archive-raw/` (ai-gf.com and 2019–2025.ai-gf.com) into the site's content:

| Output | What |
|---|---|
| `src/content/speakers/<slug>.md` | One profile per person, merged across years. Latest title, organisation and bio. |
| `src/content/editions/<year>.yaml` | Edition facts, per-year speaker appearances (role, organisation, talk title at the time), schedule. |
| `src/content/pages/*.md` | About (About Us + Organizer), Guiding Principles, Contact, Journal call (archived). |
| `src/content/settings/*.yaml` | Current edition (2026), Home intro and themes, site-wide settings. |
| `src/assets/speakers/<slug>.jpg` | Speaker photos, normalised to JPEG, max 1200px. |
| `src/assets/logos/<year>.png` | One logo per edition. |
| `public/files/<year>/` | Slides and PDFs linked from schedules. |
| `scripts/migrate/REVIEW.csv` | Things a person should check (see below). |

Edition dates, venues, themes and summaries are written by hand in `editions-meta.mjs`; everything else is parsed.

## Running it

```sh
npm run migrate              # refuses if src/content/speakers already has files
npm run migrate -- --force   # regenerates everything listed above
```

**Once editors start using the CMS, do not run it again.** `--force` deletes and rewrites the content folders, which would erase their edits.

## REVIEW.csv

Open it in Excel, Numbers or Google Sheets. Each row has what the script found, what it proposes, and a `help` column explaining what to write in `answer`. Leave `answer` empty or write `ok` to accept the proposal. Then save as CSV and re-run with `--force`. Answers are kept across runs.

| Issue | Answer with |
|---|---|
| possible same person | `same` or `different` |
| name spelling | the correct spelling |
| No organisation found / split automatically | the correct job title or organisation (`none` to leave it empty) |
| No photo / Low-resolution photo | a path inside `archive-raw/` to a better photo, or `none` |
| Unused photo | a speaker id (e.g. `raja-chatila`) to use it as their photo, `event:2024` to add it to that edition's photos, or `ignore` |

## Known source quirks

- 2023's speaker bio pages are copies of 2022's, so 2023 uses the speaker list only.
- ai-gf.com's speaker pages are copies of 2025.ai-gf.com's; speakers come from the year sites only.
- 2019 captions end in "(City, Country)", which is dropped (no location field).
- Names in schedules are matched to speakers allowing for accents, initials, word order and one-letter typos ("Yi Zeng" / "Yi Zheng"); inexact matches are listed under "name spelling".
