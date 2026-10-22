# Editing the AI Governance Forum website

You edit the site in **Pages CMS**, a website with forms. No code, no files and no installation are involved. Every save goes live by itself in about **2 minutes**.

> Screenshots: to be added once the site is on GitHub and Pages CMS is connected (see "For the site maintainer" at the end).

## Logging in

1. Go to **https://app.pagescms.org**.
2. Log in:
   - **With GitHub**, if you have a GitHub account in the AITI organisation.
   - **With your email**, if you were invited by email. You get a login link by email. No password is needed.
3. Open the **aigf-website** project.

The menu on the left has: **Site settings** (Current edition, Home page, Organiser and contact), **Speakers**, **Editions** and **Pages**. Every field has a short hint under it.

## The five common tasks

### 1. Change the date, venue, registration or livestream link

**Site settings → Current edition.**

- **Date, Start time, End time, Venue, City, Format:** change and press **Save**. The home page, the Programme page and the countdown all update.
- **Registration link:** paste the full ticket page address (starting with `https://`), then turn on **Registration open** and press **Save**. Every "Registration link coming soon" placeholder becomes a **Register** button.
- **Livestream link:** paste it to add a **Watch online** button. Empty it to remove the button.

### 2. Add or edit a speaker

**Speakers → New entry** (or click a name to edit someone).

- **Full name, Job title, Organisation:** the organisation shows on every speaker card, so fill it in.
- **Photo:** upload any portrait. The site crops and resizes it, so there is no need to edit it first. Without a photo, the site shows the person's initials.
- **Biography:** write as in a normal document. Bold, links and lists work.
- Press **Save**.

A new speaker has a profile page, but they appear in this year's programme only once they are added to the edition (next task).

**Recurring speakers:** if someone spoke before, they already have an entry. Search for their name and update their job title and organisation. Past years keep the role they had then.

### 3. Publish the programme

**Editions → 2026.**

1. **Speakers:** click **Add an item**, pick the person from the list (type to search), and add their talk title if known. The order here is the order on the page. Speakers show on the site as soon as you save.
2. **Schedule:** one row per time slot, in order.
   - **Time:** e.g. `14:00–14:30`.
   - **Title:** the session or talk title. **Leave it empty** for a talk inside the session above it: it then appears indented under that session.
   - **Speakers:** pick one or more people.
   - **Slides and links:** upload a PDF under **File**, or paste a link.
3. Press **Save**.
4. When the schedule is ready, go to **Site settings → Current edition**, turn on **Programme published** and press **Save**. Until then the Programme page shows "Programme coming soon".

### 4. Edit the About, Guiding principles or Contact page

**Pages →** the page, change the **Text**, press **Save**.

### 5. Change the home page introduction or themes

**Site settings → Home page.**

- **Introduction:** leave an empty line between paragraphs.
- **Themes:** each has a title and one line of text. Two to four look best. Drag them to reorder.
- **Show statistics:** turns the small "7 past editions · 101 speakers" line on or off.

## Preparing something in advance: "Hidden (draft)"

Speakers and pages have a **Hidden (draft)** switch. While it is on, the entry is saved but not shown on the site. Turn it off when you are ready. Use this rather than deleting: entries cannot be deleted in the CMS, so nothing gets lost by accident.

## How long changes take

About **2 minutes** after you press Save. Reload the page in your browser. If it still shows the old version, wait another minute.

**If your change doesn't appear after 5 minutes**, the site may have refused it because a field was filled in wrongly, for example a link without `https://` or a time like `2pm` instead of `14:00`. The live site stays as it was, so nothing breaks. Check the field hints, fix the field and save again, or ask for help (below).

## A new year

When you start preparing the next edition (say 2027):

1. **Editions → New entry:** year `2027`, edition number `9`, title `AI Governance Forum 2027`, date, format and venue. Save.
2. **Site settings → Current edition:** change **Year** to `2027`, **Edition number** to `9`, **Title**, **Date** and venue. Turn **Registration open** and **Programme published** off, and empty the registration and livestream links. Save.
3. **Site settings → Home page:** update the themes.

2026 then moves to the Past editions archive by itself, with its speakers and programme.

## Who to ask

- **Something looks wrong, or a change doesn't appear:** [name of the technical editor], or contact@aitransparencyinstitute.com.
- **Undoing a mistake:** every save is kept in the history. The technical editor can restore any earlier version, so just ask.

---

## For the site maintainer

- The form definitions are in `.pages.yml`; the rules each field must meet are in `src/content.config.ts`. Change both together.
- Inviting editors: in Pages CMS, open the project → **Collaborators** → **Invite a collaborator** by email (they need no GitHub account). Only someone logged in with GitHub can invite. Technical editors join the AITI GitHub organisation instead.
- Screenshots for this guide: after connecting Pages CMS, capture the five tasks above and add them under each heading (store them in `docs/editing/`).
- Do not run `just migrate` once editors use the CMS: it would overwrite their work.
