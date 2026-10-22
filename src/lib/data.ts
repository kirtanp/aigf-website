import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Speaker = CollectionEntry<'speakers'>;
export type Edition = CollectionEntry<'editions'>;
export type Appearance = Edition['data']['speakers'][number];

async function single<C extends 'current' | 'home' | 'site'>(name: C) {
  const [entry] = await getCollection(name);
  if (!entry) throw new Error(`Missing settings file: src/content/settings/${name}.yaml`);
  return entry.data as CollectionEntry<C>['data'];
}

export const getCurrent = () => single('current');
export const getHome = () => single('home');
export const getSite = () => single('site');

export async function getEditions() {
  const editions = await getCollection('editions');
  return editions.sort((a, b) => b.data.year - a.data.year);
}

export async function getPastEditions() {
  const current = await getCurrent();
  return (await getEditions()).filter((e) => e.data.year < current.year);
}

export async function getCurrentEdition() {
  const current = await getCurrent();
  return getEntry('editions', String(current.year));
}

export async function getSpeakers() {
  const speakers = await getCollection('speakers', (s) => !s.data.draft);
  return speakers.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

// "Editions spoken at" is computed from edition files, never stored on the speaker.
export async function getAppearances() {
  const byId = new Map<string, { year: number; appearance: Appearance }[]>();
  for (const e of await getEditions()) {
    for (const appearance of e.data.speakers) {
      const list = byId.get(appearance.speaker.id) ?? [];
      list.push({ year: e.data.year, appearance });
      byId.set(appearance.speaker.id, list);
    }
  }
  for (const list of byId.values()) list.sort((a, b) => b.year - a.year);
  return byId;
}

export function initials(name: string) {
  const parts = name.split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase();
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatDate(date: Date, endDate?: Date) {
  if (!endDate) return dateFmt.format(date);
  const sameMonth = date.getUTCMonth() === endDate.getUTCMonth() && date.getUTCFullYear() === endDate.getUTCFullYear();
  return sameMonth ? `${date.getUTCDate()}–${dateFmt.format(endDate)}` : `${dateFmt.format(date)} – ${dateFmt.format(endDate)}`;
}

export const formatLabel: Record<Edition['data']['format'], string> = {
  'in-person': 'In person',
  online: 'Online',
  hybrid: 'Hybrid: in person and online',
};

export function placeLabel(e: { format: Edition['data']['format']; city?: string }) {
  return e.format === 'online' ? 'Online' : [e.city, e.format === 'hybrid' ? 'and online' : ''].filter(Boolean).join(' ');
}

export function ordinal(n: number) {
  const suffix = new Intl.PluralRules('en', { type: 'ordinal' }).select(n);
  return `${n}${{ one: 'st', two: 'nd', few: 'rd', other: 'th' }[suffix as 'one' | 'two' | 'few' | 'other']}`;
}

export function timeLabel(e: { startTime?: string; endTime?: string; timezone: string }) {
  if (e.startTime && e.endTime) return `${e.startTime}–${e.endTime} ${e.timezone}`;
  return e.startTime ? `From ${e.startTime} ${e.timezone}` : '';
}

// "In person in Lausanne and online": the long form of placeLabel.
export function formatText(e: { format: Edition['data']['format']; city?: string }) {
  const inPerson = e.city ? `In person in ${e.city}` : 'In person';
  return { 'in-person': inPerson, online: 'Online', hybrid: `${inPerson} and online` }[e.format];
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// Where "get updates" points: the newsletter form once there is one, otherwise an email.
export function updatesHref(site: { newsletterFormUrl: string; contactEmail: string }, year: number) {
  if (site.newsletterFormUrl) return site.newsletterFormUrl;
  const subject = encodeURIComponent(`Keep me updated about the AI Governance Forum ${year}`);
  return `mailto:${site.contactEmail}?subject=${subject}`;
}

// schema.org Event for the current edition, so search engines can show the date and venue.
export function eventJsonLd(
  current: Awaited<ReturnType<typeof getCurrent>>,
  site: Awaited<ReturnType<typeof getSite>>,
  { url, image, description }: { url: string; image: string; description?: string },
) {
  const offset = ({ CET: '+01:00', CEST: '+02:00', UTC: 'Z', GMT: 'Z' } as Record<string, string>)[current.timezone.toUpperCase()];
  const day = isoDate(current.date);
  const at = (t: string) => (t && offset ? `${day}T${t}:00${offset}` : day);
  const place = {
    '@type': 'Place',
    name: current.venue,
    address: { '@type': 'PostalAddress', addressLocality: current.city, addressCountry: current.country },
  };
  const online = { '@type': 'VirtualLocation', url: current.livestreamUrl || url };
  const mode = { hybrid: 'MixedEventAttendanceMode', 'in-person': 'OfflineEventAttendanceMode', online: 'OnlineEventAttendanceMode' }[current.format];
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: current.title,
    ...(description && { description }),
    url,
    image: [image],
    startDate: at(current.startTime),
    ...(current.endTime && offset && { endDate: at(current.endTime) }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: `https://schema.org/${mode}`,
    location: current.format === 'hybrid' ? [place, online] : current.format === 'online' ? online : place,
    organizer: { '@type': 'Organization', name: site.organiserName, url: site.organiserUrl },
    ...(current.registrationOpen && current.registerUrl && { offers: { '@type': 'Offer', url: current.registerUrl, availability: 'https://schema.org/InStock' } }),
  };
}
