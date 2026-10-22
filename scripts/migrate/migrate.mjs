#!/usr/bin/env node
// One-shot migration: archive-raw/ (WordPress REST snapshots) → src/content + src/assets.
//
//   npm run migrate              refuses to run if migrated content already exists
//   npm run migrate -- --force   overwrites src/content/{speakers,editions,pages,settings}
//
// Once editors use the CMS, never run this again with --force: it would overwrite their edits.
// See scripts/migrate/README.md.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import * as yaml from 'js-yaml';
import {
  ROOT, ARCHIVE, clean, fixTypos, nameKey, slugify, compareNames, findName,
  htmlToMarkdown, brLines, readJson, writeFile, toCsv, parseCsv, decodeEntities,
} from './lib.mjs';
import { EDITIONS, CURRENT, BOILERPLATE } from './editions-meta.mjs';

const FORCE = process.argv.includes('--force');
const CONTENT = path.join(ROOT, 'src/content');
const ASSETS = path.join(ROOT, 'src/assets');
const PUBLIC_FILES = path.join(ROOT, 'public/files');
const REVIEW_PATH = path.join(import.meta.dirname, 'REVIEW.csv');
const EXTRA_MEDIA = path.join(ARCHIVE, 'extra-media');
const SITES = ['main', ...EDITIONS.map((e) => String(e.year))];

// ---------- guard ----------

const speakersDir = path.join(CONTENT, 'speakers');
if (fs.existsSync(speakersDir) && fs.readdirSync(speakersDir).some((f) => f.endsWith('.md')) && !FORCE) {
  console.error(
    'src/content/speakers already has content. This migration is one-shot and would overwrite\n' +
    'edits made in the CMS. Re-run with --force only if nobody has edited content yet.',
  );
  process.exit(1);
}

// ---------- review answers from a previous run ----------

const answers = new Map();
if (fs.existsSync(REVIEW_PATH)) {
  for (const row of parseCsv(fs.readFileSync(REVIEW_PATH, 'utf8'))) {
    if (row.answer) answers.set(row.id, row.answer);
  }
  console.log(`Read ${answers.size} answers from REVIEW.csv`);
}
const review = [];
function addReview(row) {
  if (!review.some((r) => r.id === row.id)) review.push({ ...row, answer: answers.get(row.id) ?? '' });
}
const answer = (id) => {
  const a = answers.get(id);
  return a && !/^ok$/i.test(a) ? a : null;
};

// ---------- media index ----------

const stripInvisible = (s) => s.replace(/[​‎‏]/g, '');
const uploadsPath = (url) => {
  const p = url?.split('/wp-content/uploads/')[1];
  return p ? stripInvisible(decodeURIComponent(p.split('?')[0])) : null;
};

const mediaIndex = new Map(); // uploads path (any size) → { file, width, height, orig, site }
for (const site of SITES) {
  for (const m of readJson(path.join(ARCHIVE, site, 'rest/media.json'))) {
    const rawOrig = m.source_url.split('/wp-content/uploads/')[1];
    const candidates = [rawOrig, decodeURIComponent(rawOrig)].map((p) => path.join(ARCHIVE, site, 'media', p.replace(/\//g, '_')));
    const file = candidates.find((f) => fs.existsSync(f));
    if (!file) continue;
    const entry = { file, width: m.media_details?.width ?? 0, height: m.media_details?.height ?? 0, orig: uploadsPath(m.source_url), site, mime: m.mime_type };
    for (const url of [m.source_url, ...Object.values(m.media_details?.sizes ?? {}).map((s) => s.source_url)]) {
      const key = uploadsPath(url);
      if (key && !mediaIndex.has(key)) mediaIndex.set(key, entry);
    }
  }
}

async function resolveMedia(url) {
  const key = uploadsPath(url);
  if (!key) return null;
  const guesses = [key, key.replace(/-\d+x\d+(\.\w+)$/, '$1'), key.replace(/-\d+x\d+(\.\w+)$/, '-scaled$1'), key.replace(/-scaled(\.\w+)$/, '$1')];
  for (const g of guesses) if (mediaIndex.has(g)) return mediaIndex.get(g);
  // Not in any media library (e.g. hot-linked from another year's site): fetch once and cache.
  const file = path.join(EXTRA_MEDIA, key.replace(/\//g, '_'));
  if (!fs.existsSync(file)) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { console.warn(`  ! could not fetch ${url} (${res.status})`); return null; }
    writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  const meta = await sharp(file).metadata().catch(() => ({}));
  const entry = { file, width: meta.width ?? 0, height: meta.height ?? 0, orig: key, site: 'extra' };
  mediaIndex.set(key, entry);
  return entry;
}

const isPlaceholderImage = (p) => /logo|favicon|5329559/i.test(p ?? '');

// ---------- per-edition parsing ----------

const pagesBySite = Object.fromEntries(SITES.map((s) => [s, readJson(path.join(ARCHIVE, s, 'rest/pages.json'))]));
const page = (site, id) => pagesBySite[site].find((p) => p.id === id);

// "Role | Org", "Role at Org", "Org" (2020), "Role<br>Org" → { title, organisation, flag }
function parseAffiliation(lines, year) {
  if (!lines.length) return { title: '', organisation: '', flag: 'missing' };
  // 2019 appends "(City, Country)"; the new site has no location field.
  const joined = clean(lines.join(' ').replace(/\s*\([^()]*,[^()]*\)\s*$/, ''));
  if (joined.includes('|')) {
    const [t, ...o] = joined.split('|').map(clean);
    return { title: t, organisation: o.join(', ').replace(/,$/, ''), flag: null };
  }
  if (year === 2020) return { title: '', organisation: lines.join(', '), flag: null };
  if (lines.length === 2 && !/(\band|,)$/.test(lines[0])) return { title: lines[0], organisation: lines[1], flag: null };
  const at = joined.lastIndexOf(' at ');
  if (at > 0) {
    const title = joined.slice(0, at), organisation = joined.slice(at + 4);
    return { title, organisation, flag: /,| and /.test(organisation) || title.includes(' at ') ? 'split' : null };
  }
  const comma = joined.lastIndexOf(', ');
  if (comma > 0) return { title: joined.slice(0, comma), organisation: joined.slice(comma + 2), flag: 'split' };
  return { title: joined, organisation: '', flag: 'missing' };
}

function parseFigure($, fig) {
  const cap = $(fig).find('figcaption');
  const lines = cap.length ? brLines($, cap) : [];
  return { img: $(fig).find('img').attr('src'), lines };
}

function parseEdition(meta) {
  const site = String(meta.year);
  const appearances = [];

  // Speaker list page: one <figure> per speaker; caption = name, then affiliation lines.
  const $ = cheerio.load(page(site, meta.speakersPageId).content.rendered);
  $('figure').each((_, fig) => {
    const { img, lines } = parseFigure($, fig);
    const name = lines[0];
    if (!name || /^credit:/i.test(name)) return;
    const rest = lines.slice(lines[0] === name ? 1 : 0);
    appearances.push({ year: meta.year, name, list: parseAffiliation(rest, meta.year), photos: [img], bio: '' });
  });

  // Bio pages are children of the Speakers page.
  if (!meta.ignoreBioPages) {
    for (const p of pagesBySite[site].filter((p) => p.parent === meta.speakersPageId)) {
      const name = clean(decodeEntities(p.title.rendered));
      const $b = cheerio.load(p.content.rendered);
      const fig = $b('figure').first();
      const { img, lines } = fig.length ? parseFigure($b, fig) : { img: null, lines: [] };
      $b('figure').remove();
      const bio = htmlToMarkdown($b.html());
      let a = appearances.find((x) => compareNames(x.name, name));
      if (!a) appearances.push((a = { year: meta.year, name, list: { title: '', organisation: '', flag: 'missing' }, photos: [] }));
      a.bio = bio;
      a.bioAffiliation = parseAffiliation(lines, meta.year);
      if (img) a.photos.unshift(img); // bio pages carry the larger photo
    }
  }

  for (const a of appearances) {
    const options = [a.list, a.bioAffiliation].filter(Boolean);
    const best = options.find((o) => !o.flag && o.organisation) ?? options.find((o) => o.organisation) ?? options[0];
    a.title = best.title;
    a.organisation = best.organisation;
    a.flag = best.flag;
  }
  return appearances;
}

// ---------- merge people across years ----------

const people = []; // { slug, name, names:Set, appearances:[] }
const editionAppearances = {};
for (const meta of [...EDITIONS].reverse()) { // newest first, so the latest spelling wins
  editionAppearances[meta.year] = parseEdition(meta);
  for (const a of editionAppearances[meta.year]) {
    let person = people.find((p) => [...p.names].some((n) => compareNames(n, a.name) === 'exact'));
    if (!person) {
      for (const p of people) {
        if (![...p.names].some((n) => compareNames(n, a.name) === 'fuzzy')) continue;
        const id = `merge:${nameKey(p.name)}|${nameKey(a.name)}`;
        addReview({
          id, issue: 'possible same person', speaker: slugify(p.name), years: `${a.year}`,
          found: `"${p.name}" and "${a.name}" (${a.year})`, proposed: 'same',
          help: 'Answer "same" or "different".',
        });
        if (!/^different$/i.test(answers.get(id) ?? '')) { person = p; break; }
      }
    }
    if (!person) people.push((person = { name: a.name, names: new Set(), appearances: [] }));
    person.names.add(a.name);
    person.appearances.push(a);
  }
}

const usedSlugs = new Set();
for (const p of people) {
  let slug = slugify(p.name);
  for (let i = 2; usedSlugs.has(slug); i++) slug = `${slugify(p.name)}-${i}`;
  usedSlugs.add(slug);
  p.id = p.slug = slug;
}
const byId = Object.fromEntries(people.map((p) => [p.id, p]));

// ---------- schedules ----------

const MONTHS = /(january|february|march|april|may|june|july|august|september|october|november|december)/i;
const GENERIC_TITLE = /^(welcome|opening|closing|wrap-?up|lunch|e-?coffee|coffee|break|discussion|panel discussion|setting-?up|keynote( (i+|\d))?)\b/i;
const normTime = (t) => clean(t).replace(/\s*[–-]\s*/, '–').replace(/\b(\d):/g, '0$1:');

function matchSpeakers(text, year) {
  const hits = [];
  const inEdition = new Set(editionAppearances[year].map((a) => people.find((p) => p.appearances.includes(a))));
  for (const p of people) {
    for (const n of p.names) {
      const m = findName(text, n);
      if (!m) continue;
      // Outside this year's speaker list, accept only exact matches (e.g. the organiser at the welcome).
      if (!inEdition.has(p) && !m.exact) continue;
      if (!m.exact) {
        addReview({
          id: `name:${p.id}`, issue: 'name spelling', speaker: p.id, years: `${year}`,
          found: `Speaker list says "${p.name}", schedule says "${text.length > 140 ? text.slice(0, 140) + '…' : text}"`, proposed: p.name,
          help: 'Write the correct spelling of the name, or "ok".',
        });
      }
      hits.push(p);
      break;
    }
  }
  return hits;
}

async function copyPdf(url, year) {
  const local = await resolveMedia(url);
  if (!local) return url;
  const name = path.basename(local.orig);
  fs.mkdirSync(path.join(PUBLIC_FILES, String(year)), { recursive: true });
  fs.copyFileSync(local.file, path.join(PUBLIC_FILES, String(year), name));
  return `/files/${year}/${name}`;
}

async function parseSchedule(meta) {
  const site = String(meta.year);
  const $ = cheerio.load(page(site, meta.schedulePageId).content.rendered);
  const items = [];
  let day = null;
  const rows = [];
  $('h1,h2,h3,h4,h5,h6,table').each((_, el) => {
    if (el.tagName !== 'table') {
      const t = clean($(el).text());
      if (MONTHS.test(t) && /\d{4}/.test(t)) day = t;
      return;
    }
    $(el).find('tr').each((_, tr) => rows.push({ tr, day }));
  });

  for (const { tr, day } of rows) {
    const tds = $(tr).find('td');
    if (tds.length < 2) continue;
    const time = clean(tds.eq(0).text());
    const links = [];
    for (const a of tds.eq(1).find('a').toArray()) {
      const href = $(a).attr('href');
      const label = clean($(a).text()).replace(/^\[|\]$/g, '');
      if (href) links.push({ label: label || 'Link', url: /\.pdf$/i.test(href) ? await copyPdf(href, meta.year) : href });
    }
    const lines = brLines($, tds.eq(1)).map((l) => clean(l.replace(/\[[^\]]*\]/g, ''))).filter(Boolean);
    if (time) items.push({ day, time: normTime(time), title: lines[0] ?? '', lines: lines.slice(1), links });
    else if (items.length) {
      items.at(-1).lines.push(...lines);
      items.at(-1).links.push(...links);
    }
  }

  // Link speakers and derive each appearance's talk title and session role.
  const details = []; // { person, talkTitle, sessionRole }
  let session = null;
  for (const item of items) {
    const titleHits = matchSpeakers(item.title, meta.year);
    const isSubItem = titleHits.length === 1 && nameOnly(item.title, titleHits[0]);
    if (!isSubItem && !GENERIC_TITLE.test(item.title)) session = item.title;
    const speakers = [];
    const keep = [];
    for (const [i, line] of [item.title, ...item.lines].entries()) {
      const hits = i === 0 ? titleHits : matchSpeakers(line, meta.year);
      for (const p of hits) {
        if (speakers.includes(p)) continue;
        speakers.push(p);
        details.push({ person: p, ...describe(item, line, p, isSubItem ? session : null) });
      }
      if (i > 0 && !(hits.length === 1 && nameOnly(line, hits[0]))) keep.push(line);
    }
    // A schedule title that names a single speaker of a talk keeps the talk title once.
    const single = speakers.length === 1 && !isSubItem && !GENERIC_TITLE.test(item.title);
    if (single) details.at(-1).talkTitle ??= item.title.replace(/^(talk|keynote)\s*[:–-]\s*/i, '');
    item.title = isSubItem ? '' : item.title;
    item.speakers = speakers.map((p) => p.slug);
    item.description = keep.join('\n');
    delete item.lines;
  }
  const days = new Set(items.map((i) => i.day));
  for (const i of items) if (days.size < 2) delete i.day;
  return { items, details };
}

// Is `line` just the person's name, maybe with a parenthetical affiliation?
function nameOnly(line, person) {
  const rest = line.replace(/\([^)]*\)/g, ' ').replace(/^(moderated by|moderator:|chair:)/i, ' ');
  const tokens = clean(rest).split(' ').filter((t) => t.replace(/[^\p{L}]/gu, '').length > 1);
  return tokens.length <= nameKey(person.name).split(' ').length + 1 && [...person.names].some((n) => findName(rest, n));
}

function describe(item, line, person, sessionTitle) {
  let talkTitle, sessionRole;
  if (/^(moderated by|moderator)/i.test(line)) sessionRole = 'Moderator';
  else if (/^chair/i.test(line)) sessionRole = 'Chair';
  else if (/^panelists?:/i.test(line) || /^panel/i.test(item.title)) sessionRole = 'Panelist';
  else if (/^keynote/i.test(item.title)) sessionRole = 'Keynote';
  // 2019: "<talk title>, <Name> (affiliation)"
  const name = [...person.names].find((n) => line.includes(n)) ?? person.name;
  const at = line.indexOf(name);
  if (at > 2 && line[at - 2] === ',') talkTitle = clean(line.slice(0, at - 2));
  // 2024: "Speakers: Name (Topic), Name (Topic)"
  if (/^(speakers|panelists):/i.test(line) && at >= 0) {
    const m = line.slice(at + name.length).match(/^\s*\(([^)]+)\)/);
    if (m) talkTitle = m[1];
  }
  // 2024 keynotes: the talk title is a quoted line
  if (!talkTitle && /^keynote/i.test(item.title)) {
    const q = item.lines.find((l) => /^[“"]/.test(l));
    if (q) talkTitle = q.replace(/^[“"]|[”"]$/g, '');
  }
  if (!talkTitle && sessionTitle) talkTitle = sessionTitle;
  return { talkTitle, sessionRole };
}

// ---------- photos ----------

async function choosePhoto(person) {
  const override = answer(`photo:${person.id}`);
  if (override && /^none$/i.test(override)) return null;
  if (override) {
    const file = path.join(ARCHIVE, override);
    if (fs.existsSync(file)) return { file, orig: override };
    console.warn(`  ! REVIEW photo for ${person.slug}: ${override} not found in archive-raw/`);
  }
  const candidates = [];
  for (const a of [...person.appearances].sort((x, y) => y.year - x.year)) {
    for (const url of a.photos) {
      if (!url || isPlaceholderImage(url)) continue;
      const m = await resolveMedia(url);
      if (m && !isPlaceholderImage(m.orig)) candidates.push({ ...m, year: a.year });
    }
  }
  person.photoCandidates = candidates;
  if (!candidates.length) return null;
  const [first] = candidates;
  // Prefer the newest photo, unless it is tiny and an older one is much larger.
  const larger = candidates.find((c) => c.width >= 2 * first.width && c.width >= 300);
  return first.width < 300 && larger ? larger : first;
}

async function writeSpeakerPhoto(src, slug) {
  const out = path.join(ASSETS, 'speakers', `${slug}.jpg`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(src)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out);
  return `../../assets/speakers/${slug}.jpg`;
}

// ---------- output helpers ----------

const dump = (obj) => yaml.dump(obj, { lineWidth: 100, noRefs: true, quotingType: '"' });
const frontmatter = (data, body = '') => `---\n${dump(data)}---\n${body ? `\n${body.trim()}\n` : ''}`;
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)));

function pageMarkdown(site, id, { dropFirstSentence } = {}) {
  const $ = cheerio.load(page(site, id).content.rendered);
  $('figure').remove();
  let md = htmlToMarkdown($.html());
  if (dropFirstSentence) md = md.replace(dropFirstSentence, '').trim();
  return md;
}

function editionSummary(meta) {
  const $ = cheerio.load(page(String(meta.year), meta.homePageId).content.rendered);
  return $('p')
    .toArray()
    .map((p) => fixTypos(clean($(p).text())))
    .filter((t) => t.length > 60 && !BOILERPLATE.some((re) => re.test(t)))
    .join('\n\n');
}

async function copyLogo(name, site, out) {
  const dir = path.join(ARCHIVE, site, 'media');
  const file = fs.readdirSync(dir).find((f) => stripInvisible(f) === stripInvisible(name));
  if (!file) { console.warn(`  ! logo ${name} not found in ${site}`); return null; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(path.join(dir, file)).trim().resize({ width: 1600, withoutEnlargement: true }).png().toFile(out);
  return out;
}

// ---------- run ----------

for (const dir of ['speakers', 'editions', 'pages', 'settings']) fs.rmSync(path.join(CONTENT, dir), { recursive: true, force: true });
for (const dir of ['speakers', 'logos', 'editions']) fs.rmSync(path.join(ASSETS, dir), { recursive: true, force: true });
fs.rmSync(PUBLIC_FILES, { recursive: true, force: true });

// Name corrections from REVIEW.csv apply before anything is written.
for (const p of people) {
  const fixed = answer(`name:${p.id}`);
  if (fixed && fixed !== p.name) {
    p.names.add(fixed);
    p.name = fixed;
    usedSlugs.delete(p.slug);
    p.slug = slugify(fixed);
    for (let i = 2; usedSlugs.has(p.slug); i++) p.slug = `${slugify(fixed)}-${i}`;
    usedSlugs.add(p.slug);
  }
}
// An unused photo assigned to a speaker becomes their photo, unless their own photo row says otherwise.
for (const [id, a] of answers) {
  if (id.startsWith('unused:') && byId[a] && !answers.has(`photo:${a}`)) answers.set(`photo:${a}`, id.slice('unused:'.length));
}

// Editions (schedules first: they add appearances for people found only in the programme).
const usedPhotoPaths = new Set();
const editionDocs = {};
for (const meta of EDITIONS) {
  const { items, details } = await parseSchedule(meta);
  const listed = editionAppearances[meta.year];
  const appearances = [];
  for (const a of listed) {
    const p = people.find((x) => x.appearances.includes(a));
    if (appearances.some((x) => x.person === p)) continue;
    appearances.push({ person: p, a });
  }
  for (const d of details) {
    if (!appearances.some((x) => x.person === d.person)) appearances.push({ person: d.person, a: null });
  }
  editionDocs[meta.year] = { meta, items, details, appearances };
}

// Speakers.
let photoCount = 0;
for (const p of people) {
  const years = [...new Set(p.appearances.map((a) => a.year))].sort();
  const latestWithOrg = [...p.appearances].sort((x, y) => y.year - x.year).find((a) => a.organisation && !a.flag)
    ?? [...p.appearances].sort((x, y) => y.year - x.year).find((a) => a.organisation)
    ?? [...p.appearances].sort((x, y) => y.year - x.year)[0];
  let { title, organisation } = latestWithOrg;
  const flag = p.appearances.some((a) => a.organisation && !a.flag) ? null : latestWithOrg.flag;
  const titleFix = answer(`title:${p.id}`), orgFix = answer(`organisation:${p.id}`);
  if (titleFix) title = /^none$/i.test(titleFix) ? '' : titleFix;
  if (orgFix) organisation = /^none$/i.test(orgFix) ? '' : orgFix;
  if (flag) {
    const why = flag === 'missing' ? 'No organisation found' : 'Role and organisation were split automatically';
    addReview({ id: `title:${p.id}`, issue: why, speaker: p.id, years: years.join(' '), found: latestWithOrg.list?.title || latestWithOrg.title, proposed: latestWithOrg.title, help: 'Job title only (e.g. "Professor of Law"). Write the correct one, or "ok".' });
    addReview({ id: `organisation:${p.id}`, issue: why, speaker: p.id, years: years.join(' '), found: [latestWithOrg.title, latestWithOrg.organisation].filter(Boolean).join(' / '), proposed: latestWithOrg.organisation, help: 'Organisation only (e.g. "University of Zurich"). Write the correct one, or "ok".' });
  }

  const bioSource = [...p.appearances].sort((x, y) => y.year - x.year).find((a) => a.bio);
  const photo = await choosePhoto(p);
  let photoPath;
  if (photo) {
    photoPath = await writeSpeakerPhoto(photo.file, p.slug);
    usedPhotoPaths.add(photo.orig);
    photoCount++;
    if (photo.width && photo.width < 250) {
      addReview({ id: `photo:${p.id}`, issue: 'Low-resolution photo', speaker: p.id, years: years.join(' '), found: `${path.relative(ARCHIVE, photo.file)} (${photo.width}×${photo.height}px)`, proposed: path.relative(ARCHIVE, photo.file), help: 'Path of a better photo inside archive-raw/, "none", or "ok".' });
    }
  } else {
    addReview({ id: `photo:${p.id}`, issue: 'No photo', speaker: p.id, years: years.join(' '), found: '', proposed: 'none', help: 'Path of a photo inside archive-raw/ (see "Unused photo" rows), or "ok" to show initials.' });
  }
  for (const c of p.photoCandidates ?? []) usedPhotoPaths.add(c.orig);

  // Slides linked from bios live on the old sites, which will be shut down: host them here.
  let bio = bioSource?.bio ?? '';
  for (const url of new Set(bio.match(/https?:\/\/[^)\s]*ai-gf\.com\/wp-content\/uploads\/[^)\s]+\.pdf/gi) ?? [])) {
    bio = bio.replaceAll(url, await copyPdf(url, bioSource.year));
  }
  // WordPress wrapped these links as "[Slides]" in bold: keep just the link.
  bio = bio.replace(/\*\*\\\[(\[[^\]]+\]\([^)]+\))\\\]\*\*/g, '$1');
  writeFile(
    path.join(CONTENT, 'speakers', `${p.slug}.md`),
    frontmatter(compact({ name: p.name, title, organisation, photo: photoPath, links: [], draft: false }), bio),
  );
}

// Edition files. Speaker references are written as file names ("jane-doe.md"), the
// form Pages CMS stores when an editor picks a speaker; the schema accepts both.
const ref = (slug) => `${slug}.md`;
for (const { meta, items, details, appearances } of Object.values(editionDocs)) {
  const speakers = appearances.map(({ person, a }) => {
    const d = details.filter((x) => x.person === person);
    return compact({
      speaker: ref(person.slug),
      roleAtTheTime: a?.title,
      organisationAtTheTime: a?.organisation,
      talkTitle: d.find((x) => x.talkTitle)?.talkTitle,
      sessionRole: d.find((x) => x.sessionRole)?.sessionRole,
    });
  });
  const logo = await copyLogo(meta.logo, meta.logoSite ?? String(meta.year), path.join(ASSETS, 'logos', `${meta.year}.png`));
  const photos = [];
  for (const [id, a] of answers) {
    const m = a.match(/^event(?::\s*(\d{4}))?$/i);
    if (!id.startsWith('unused:') || !m || Number(m[1]) !== meta.year) continue;
    const src = path.join(ARCHIVE, id.slice('unused:'.length));
    const out = path.join(ASSETS, 'editions', String(meta.year), path.basename(src).replace(/\.\w+$/, '.jpg'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(src).rotate().resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
    photos.push({ image: `../../assets/editions/${meta.year}/${path.basename(out)}`, alt: '' });
  }
  const doc = compact({
    year: meta.year,
    number: meta.number,
    title: `AI Governance Forum ${meta.year}`,
    theme: meta.theme,
    subtitle: meta.subtitle,
    date: meta.date,
    endDate: meta.endDate,
    startTime: meta.startTime,
    endTime: meta.endTime,
    timezone: meta.year === 2020 ? 'CEST' : 'CET',
    format: meta.format,
    city: meta.city,
    venue: meta.venue,
    summary: meta.summary ?? editionSummary(meta),
    supportedBy: meta.supportedBy,
    logo: logo ? `../../assets/logos/${meta.year}.png` : undefined,
    oldSiteUrl: `https://${meta.year}.ai-gf.com/`,
    speakers,
    schedule: items.map((i) => compact({ ...i, speakers: i.speakers?.map(ref) })),
    photos,
  });
  writeFile(path.join(CONTENT, 'editions', `${meta.year}.yaml`), dump(doc));
}

// Unused photos, so a person can attach them to a speaker or an edition.
const seenBasenames = new Set();
for (const m of new Set(mediaIndex.values())) {
  if (!/^image\//.test(m.mime ?? '') || usedPhotoPaths.has(m.orig) || isPlaceholderImage(m.orig)) continue;
  if (/cropped-|^201[0-8]\//.test(m.orig) || Math.max(m.width, m.height) < 150) continue;
  const base = path.basename(m.orig).replace(/-\d+x\d+(\.\w+)$/, '$1');
  if (seenBasenames.has(base)) continue;
  seenBasenames.add(base);
  const rel = path.relative(ARCHIVE, m.file);
  addReview({ id: `unused:${rel}`, issue: 'Unused photo', speaker: '', years: m.orig.slice(0, 4), found: `${rel} (${m.width}×${m.height}px)`, proposed: 'ignore', help: 'A speaker id (e.g. "raja-chatila") to use it as their photo, "event:2024" to add it to that edition\'s photos, or "ignore".' });
}

// The current edition: logistics live in settings/current.yaml; this file holds its speakers and programme.
writeFile(path.join(CONTENT, 'editions', `${CURRENT.year}.yaml`), dump({
  year: CURRENT.year,
  number: CURRENT.number,
  title: `AI Governance Forum ${CURRENT.year}`,
  date: CURRENT.date,
  format: CURRENT.format,
  city: CURRENT.city,
  venue: CURRENT.venue,
  logo: `../../assets/logos/${CURRENT.year}.png`,
  speakers: [],
  schedule: [],
}));

// Logo for the current edition.
await copyLogo(CURRENT.logo, CURRENT.logoSite, path.join(ASSETS, 'logos', `${CURRENT.year}.png`));
await copyLogo('2026_08_Logo-2026.001-edited.png', 'main', path.join(ASSETS, 'logos', `${CURRENT.year}-wordmark.png`));

// Pages.
const welcome = /^Welcome to the _?eighth_? edition of the AI Governance Forum!\s*/;
writeFile(path.join(CONTENT, 'pages', 'about.md'), frontmatter(
  { title: 'About', description: 'The AI Governance Forum and its organiser, the AI Transparency Institute.', draft: false },
  `${pageMarkdown('main', 6, { dropFirstSentence: welcome })}\n\n## The AI Transparency Institute\n\n${pageMarkdown('main', 42)}`,
));
writeFile(path.join(CONTENT, 'pages', 'guiding-principles.md'), frontmatter(
  { title: 'Guiding Principles', description: 'How talks and discussions run at the AI Governance Forum.', draft: false },
  pageMarkdown('main', 332),
));
writeFile(path.join(CONTENT, 'pages', 'contact.md'), frontmatter(
  { title: 'Contact', description: 'Get in touch with the AI Governance Forum team.', draft: false },
  'For questions about the forum, speaking, partnerships or press, email the AI Transparency Institute team. We usually reply within a few working days.',
));
writeFile(path.join(CONTENT, 'pages', 'journal-call.md'), frontmatter(
  { title: 'AI & Ethics Journal: call for papers', description: 'Topical collection in the Springer AI & Ethics Journal (closed).', archived: true, draft: false },
  pageMarkdown('main', 262),
));

// Settings.
writeFile(path.join(CONTENT, 'settings', 'current.yaml'), dump({
  year: CURRENT.year,
  number: CURRENT.number,
  title: `AI Governance Forum ${CURRENT.year}`,
  theme: '',
  date: CURRENT.date,
  startTime: '',
  endTime: '',
  timezone: 'CET',
  format: CURRENT.format,
  venue: CURRENT.venue,
  city: CURRENT.city,
  country: CURRENT.country,
  registerUrl: '',
  livestreamUrl: '',
  registrationOpen: false,
  programmePublished: false,
}));
const home = cheerio.load(page('main', 5).content.rendered);
const intro = home('p').toArray().map((p) => fixTypos(clean(home(p).text()))).filter((t) => t.length > 60 && !t.includes("|") && !/previous editions/i.test(t));
writeFile(path.join(CONTENT, 'settings', 'home.yaml'), dump({
  tagline: 'A multi-stakeholder forum for safe, trustworthy and sustainable AI.',
  intro: intro.join('\n\n'),
  themes: [
    { title: 'AI safety', text: 'Frontier models, guardrails and red teaming: how rules and standards can keep pace with emerging risks.' },
    { title: 'Trust and transparency', text: 'Explainability, accountability and fairness: the conditions under which people can rely on AI.' },
    { title: 'Sustainability', text: 'AI in the interest of future generations, from its climate footprint to responsible business models.' },
  ],
  showStats: true,
}));
writeFile(path.join(CONTENT, 'settings', 'site.yaml'), dump({
  contactEmail: 'contact@aitransparencyinstitute.com',
  organiserName: 'AI Transparency Institute',
  organiserUrl: 'https://aitransparencyinstitute.com',
  organiserSummary: 'A non-profit interdisciplinary research centre in Switzerland, dedicated to AI governance, human trust in AI and corporate digital responsibility. It reinvests all revenues in its core activities.',
  organiserMissions: ['Education', 'Legal watch', 'Research'],
  newsletterFormUrl: '',
  social: [],
}));

// REVIEW.csv, keeping earlier answers.
const order = ['possible same person', 'name spelling', 'No organisation found', 'Role and organisation were split automatically', 'No photo', 'Low-resolution photo', 'Unused photo'];
review.sort((a, b) => order.indexOf(a.issue) - order.indexOf(b.issue) || a.id.localeCompare(b.id));
writeFile(REVIEW_PATH, toCsv(review, ['id', 'issue', 'speaker', 'years', 'found', 'proposed', 'answer', 'help']));

// Summary.
const counts = review.reduce((acc, r) => ({ ...acc, [r.issue]: (acc[r.issue] ?? 0) + 1 }), {});
console.log(`Speakers: ${people.length} (${photoCount} with photos)`);
for (const { meta, items, appearances } of Object.values(editionDocs)) {
  console.log(`  ${meta.year}: ${appearances.length} speakers, ${items.length} schedule items`);
}
console.log('REVIEW.csv:', counts);
