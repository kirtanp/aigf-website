// Helpers for the one-shot WordPress → Astro content migration.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const ARCHIVE = path.join(ROOT, 'archive-raw');

// ---------- text ----------

export function decodeEntities(s = '') {
  return cheerio.load(`<p>${s}</p>`)('p').text();
}

export function clean(s = '') {
  return s
    .replace(/[ ​‎‏]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

// Typos seen on the old sites. Applied to all migrated prose.
const TYPOS = [
  [/\badresses\b/g, 'addresses'],
  [/\bmulti-stakeholders platform\b/g, 'multi-stakeholder platform'],
];
export function fixTypos(s) {
  return TYPOS.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// "Peter J. Schildkraut" → "peter schildkraut"; used to merge the same person across years.
export function nameKey(name) {
  return stripAccents(name)
    .toLowerCase()
    .replace(/^(prof|dr|mr|ms|mrs)\.?\s+/g, '')
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1)
    .join(' ');
}

export function slugify(name) {
  return stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function levenshtein(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function tokenMatch(a, b) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && levenshtein(a, b) <= 1) return true;
  // "christoph" / "christopher"
  if (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
}

// Do two names look like the same person? Returns 'exact' | 'fuzzy' | null.
export function compareNames(a, b) {
  const ka = nameKey(a), kb = nameKey(b);
  if (ka === kb) return 'exact';
  const ta = ka.split(' '), tb = kb.split(' ');
  if (ta.length !== tb.length) return null;
  const sortedA = [...ta].sort(), sortedB = [...tb].sort();
  if (sortedA.join(' ') === sortedB.join(' ')) return 'fuzzy'; // "Kim Seungryong"
  if (ta.every((t, i) => tokenMatch(t, tb[i]))) return 'fuzzy';
  return null;
}

// Find where `name` occurs in `text` (token-wise, tolerant of accents, initials,
// word order and one-letter typos). Returns {start, end, exact} on the token
// array of `text`, or null.
export function findName(text, name) {
  const words = stripAccents(text).toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(' ');
  const wanted = nameKey(name).split(' ');
  if (!wanted[0]) return null;
  const tokens = words.filter((w) => w.length > 1);
  for (let i = 0; i < tokens.length; i++) {
    // Allow one stray token inside the name (a middle name or initial-like word).
    const window = tokens.slice(i, i + wanted.length + 1);
    const used = new Set();
    const ok = wanted.every((w) => {
      const j = window.findIndex((x, k) => !used.has(k) && tokenMatch(w, x));
      if (j < 0) return false;
      used.add(j);
      return true;
    });
    if (ok) return { exact: ` ${tokens.join(' ')} `.includes(` ${wanted.join(' ')} `) };
  }
  return null;
}

// ---------- html ----------

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '_' });
turndown.remove(['figure', 'img', 'script', 'style', 'iframe']);
turndown.addRule('dropEmptyLinks', {
  filter: (node) => node.nodeName === 'A' && !node.textContent.trim(),
  replacement: () => '',
});

// Repair link targets copied badly into WordPress: Outlook "safelinks" wrappers,
// "www.example.org" pasted without https:// (which WordPress turned into a path on
// the speaker's own site), and hrefs that are really garbled text. Null drops the link.
function cleanHref(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return /^https?:/i.test(url) ? null : url; // an unparseable web address is garbage; relative paths stay
  }
  if (/safelinks\.protection\.outlook\.com$/.test(u.hostname) && u.searchParams.get('url')) return cleanHref(u.searchParams.get('url'));
  const www = u.pathname.indexOf('/www.');
  if (www >= 0) return `https://${u.pathname.slice(www + 1)}`;
  if (!u.hostname.includes('.') || /%20|\s/.test(u.hostname)) return null;
  return url;
}

export function htmlToMarkdown(html) {
  const md = turndown
    .turndown(html.replace(/&nbsp;/g, ' '))
    .replace(/[\u00a0]/g, ' ')
    .replace(/[\u200b\u200e\u200f]/g, '')
    .replace(/^(\s*)([-*]|\d+\.)\s{2,}/gm, '$1$2 ')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (link, text, url) => {
      const href = cleanHref(url);
      return href === null ? text : href === url ? link : `[${text}](${href})`;
    })
    .trim();
  return fixTypos(md);
}

// Split an element's inner HTML on <br> into clean text lines.
export function brLines($, el) {
  const html = $(el).html() ?? '';
  return html
    .split(/<br\s*\/?>/i)
    .map((part) => clean(decodeEntities(part.replace(/<[^>]+>/g, ' '))))
    .filter(Boolean);
}

// ---------- io ----------

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

// Minimal RFC 4180 CSV.
export function toCsv(rows, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}
