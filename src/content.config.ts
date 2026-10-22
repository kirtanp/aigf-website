import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Every editable field is validated here, so a bad CMS edit fails the build
// (and the preview) instead of breaking the live site.

const url = z.string().regex(/^https?:\/\/\S+$/, 'Use a full URL starting with https://');
const optionalUrl = z.union([z.literal(''), url]).default('');
const link = z.object({
  label: z.string().min(1),
  // Full URLs, or site-relative paths for files we host (e.g. /files/2025/slides.pdf).
  url: z.string().regex(/^(https?:\/\/|\/)\S*$/, 'Use a full URL or a path starting with /'),
});
// A file uploaded through the CMS (path under /files/) or a link: editors fill one.
const linkOrFile = z
  .object({
    label: z.string().min(1),
    url: z.string().regex(/^(https?:\/\/|\/)\S*$/, 'Use a full URL or a path starting with /').optional(),
    file: z.string().regex(/^\/\S+$/).optional(),
  })
  .refine((l) => l.url || l.file, 'Add a link or upload a file')
  .transform(({ label, url, file }) => ({ label, url: (file || url)! }));
// Pages CMS stores a picked speaker as its file name ("jane-doe.md"); Astro wants the id.
const speakerRef = z.preprocess((v) => (typeof v === 'string' ? v.replace(/^.*\//, '').replace(/\.md$/, '') : v), reference('speakers'));
const time = z.string().regex(/^(\d{2}:\d{2})?$/, 'Use 24-hour time, e.g. 14:00');
const format = z.enum(['in-person', 'online', 'hybrid']);

const speakers = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/speakers' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      title: z.string().optional(),
      organisation: z.string().optional(),
      photo: image().optional(),
      links: z.array(link).default([]),
      draft: z.boolean().default(false),
    }),
});

const editions = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/editions' }),
  schema: ({ image }) =>
    z.object({
      year: z.number().int().min(2019),
      number: z.number().int().positive(),
      title: z.string(),
      theme: z.string().optional(),
      subtitle: z.string().optional(),
      date: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      startTime: time.optional(),
      endTime: time.optional(),
      timezone: z.string().default('CET'),
      format,
      city: z.string().optional(),
      venue: z.string().optional(),
      summary: z.string().optional(),
      supportedBy: z.array(z.string()).default([]),
      logo: image().optional(),
      oldSiteUrl: url.optional(),
      speakers: z
        .array(
          z.object({
            speaker: speakerRef,
            roleAtTheTime: z.string().optional(),
            organisationAtTheTime: z.string().optional(),
            talkTitle: z.string().optional(),
            sessionRole: z.string().optional(),
          }),
        )
        .default([]),
      schedule: z
        .array(
          z.object({
            day: z.string().optional(),
            time: z.string(),
            title: z.string().default(''),
            speakers: z.array(speakerRef).default([]),
            description: z.string().optional(),
            links: z.array(linkOrFile).default([]),
          }),
        )
        .default([]),
      photos: z.array(z.object({ image: image(), alt: z.string().default('') })).default([]),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    archived: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

// Settings: one YAML file each, edited as single forms in the CMS.
const current = defineCollection({
  loader: glob({ pattern: 'current.yaml', base: './src/content/settings' }),
  schema: z.object({
    year: z.number().int(),
    number: z.number().int(),
    title: z.string(),
    theme: z.string().default(''),
    date: z.coerce.date(),
    startTime: time.default(''),
    endTime: time.default(''),
    timezone: z.string().default('CET'),
    format,
    venue: z.string(),
    city: z.string(),
    country: z.string(),
    registerUrl: optionalUrl,
    livestreamUrl: optionalUrl,
    registrationOpen: z.boolean().default(false),
    programmePublished: z.boolean().default(false),
  }),
});

const home = defineCollection({
  loader: glob({ pattern: 'home.yaml', base: './src/content/settings' }),
  schema: z.object({
    // One line under the title in the hero.
    tagline: z.string().default(''),
    intro: z.string(),
    themes: z.array(z.object({ title: z.string().min(1), text: z.string().min(1) })).default([]),
    showStats: z.boolean().default(true),
  }),
});

const site = defineCollection({
  loader: glob({ pattern: 'site.yaml', base: './src/content/settings' }),
  schema: z.object({
    contactEmail: z.string().email(),
    organiserName: z.string(),
    organiserUrl: url,
    organiserSummary: z.string().default(''),
    organiserMissions: z.array(z.string().min(1)).default([]),
    newsletterFormUrl: optionalUrl,
    social: z.array(link).default([]),
  }),
});

export const collections = { speakers, editions, pages, current, home, site };
