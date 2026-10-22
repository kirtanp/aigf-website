// Edition facts and summaries, transcribed by hand from each year's home page and the
// "Previous Editions" page on ai-gf.com (checked 2026-10-22). Parsing these
// from free-form headings was less reliable than writing them down once.

const LAUSANNE = {
  city: 'Lausanne',
  venue: 'Swiss Institute of Comparative Law, University of Lausanne',
};

export const EDITIONS = [
  {
    year: 2019, number: 1, homePageId: 1341, speakersPageId: 222, schedulePageId: 223,
    summary: "The first AI Governance Forum met at the Brocher Foundation near Geneva to discuss building human trust in AI, from accountability and privacy to an international consensus on AI policy. It was supported by the Swiss Federal Office of Communications (OFCOM).",
    date: '2019-03-23', format: 'in-person', city: 'Geneva',
    venue: 'Brocher Foundation, Hermance',
    theme: 'Building Human Trust in Artificial Intelligence',
    supportedBy: ['Federal Office of Communications OFCOM of the Swiss Confederation'],
    logo: '2019_02_AI-GF.001.png',
  },
  {
    year: 2020, number: 2, homePageId: 1695, speakersPageId: 222, schedulePageId: 223,
    summary: "Held online over two days during the COVID-19 pandemic, the second edition asked whether AI could help govern crises, with panels on healthcare, contact tracing and privacy, and digital ethics, and a focus on climate change.",
    date: '2020-06-08', endDate: '2020-06-09', format: 'online',
    theme: 'From the Governance of AI to Governance via AI?',
    subtitle: 'A focus on COVID-19 and Climate Change',
    logo: '2020_04_ai0gf-logo-alpha.png',
  },
  {
    year: 2021, number: 3, homePageId: 5, speakersPageId: 48, schedulePageId: 45,
    summary: "A half-day online edition on the standardization and certification of AI, with perspectives from the United States, Singapore, UNESCO and international standards bodies.",
    date: '2021-12-08', startTime: '13:00', endTime: '15:00', format: 'online',
    theme: 'Standardization and Certification of AI',
    logo: '2021_11_AI-GF-21-Logo.001.png', logoSite: 'main',
  },
  {
    year: 2022, number: 4, homePageId: 5, speakersPageId: 48, schedulePageId: 45,
    summary: "A full-day online edition on the EU AI Act proposal and whether it can lead to a global consensus on trustworthy AI, with a focus on healthcare. Speakers were invited to contribute to a topical collection in the Springer AI & Ethics Journal.",
    date: '2022-11-26', startTime: '09:00', endTime: '17:00', format: 'online',
    theme: 'The EU AI Act: Towards a Global Consensus on Trustworthy AI?',
    subtitle: 'Implications for Healthcare',
    logo: '2022_10_AIGF22-Logo.png', logoSite: 'main',
  },
  {
    year: 2023, number: 5, homePageId: 438, speakersPageId: 48, schedulePageId: 45,
    date: '2023-12-01', startTime: '09:00', endTime: '16:00', format: 'online',
    theme: 'Regulating emerging AI technologies and applications across borders',
    // The 2023 site's bio pages are leftover copies of 2022's, so ignore them.
    ignoreBioPages: true,
    logo: '2023_09_‎AIGF-Logo.‎001-1.png',
  },
  {
    year: 2024, number: 6, homePageId: 5, speakersPageId: 48, schedulePageId: 45,
    summary: "The sixth edition, at the Swiss Institute of Comparative Law in Lausanne and online, compared AI law in the EU, China, the United States and Japan, and looked at harmonized standards and the code of practice for general-purpose AI. It was supported by Stiftung Mercator Schweiz.",
    date: '2024-10-30', startTime: '13:00', endTime: '18:00', format: 'hybrid', ...LAUSANNE,
    theme: 'EU AI Act and Comparative AI Law',
    subtitle: 'AI Regulation, Harmonized Standards, and Code of Practice for General Purpose AI (GPAI)',
    supportedBy: ['Stiftung Mercator Schweiz'],
    logo: '2024_09_AIGF-Logo.001.png', logoSite: 'main',
  },
  {
    year: 2025, number: 7, homePageId: 792, speakersPageId: 48, schedulePageId: 45,
    summary: "The seventh edition, in Lausanne and online, brought together Asian, European and Swiss, and US perspectives on the open questions in AI governance.",
    date: '2025-12-10', startTime: '14:00', endTime: '17:00', format: 'hybrid', ...LAUSANNE,
    theme: 'AI Governance: Open Questions',
    logo: '2025_11_Logo-2025.001.png', logoSite: 'main',
  },
];

export const CURRENT = {
  year: 2026, number: 8,
  date: '2026-12-17', format: 'hybrid', ...LAUSANNE, country: 'Switzerland',
  logo: '2026_08_Logo-2026.001.png', logoSite: 'main',
};

// Paragraphs on edition home pages that are generic boilerplate, not a summary.
export const BOILERPLATE = [
  /multi-?stakeholders? platform/i,
  /collective intelligence/i,
  /is organi[sz]ed by the AI Transparency Institute/i,
  /premier international event/i,
  /previous editions/i,
  /domain of mobility/i,
  /^welcome to the/i,
  /^what is ai governance forum/i,
  /^building (human )?trust in artificial intelligence!?$/i,
  /is supported by/i,
  /^register$/i,
  /hybrid event/i,
  /^credit:/i,
];
