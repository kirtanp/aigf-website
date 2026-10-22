// Default social-sharing image (1200×630): the wordmark in white on the brand gradient.
// Generated at build time, so it follows the header wordmark without a separate file to keep in sync.
import path from 'node:path';
import type { APIRoute } from 'astro';
import sharp from 'sharp';

const W = 1200;
const H = 630;
// Same file the header imports (src/components/Header.astro).
const WORDMARK = path.join(process.cwd(), 'src/assets/logos/2026-wordmark.png');

const rings = [520, 440, 360, 280, 200, 120].map((r) => `<circle cx="1060" cy="90" r="${r}" fill="none" stroke="white" stroke-opacity="0.16" stroke-width="2"/>`).join('');
const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#3c0aff"/><stop offset="1" stop-color="#d6006a"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>${rings}
</svg>`;

export const GET: APIRoute = async () => {
  // Recolour the wordmark white, keeping its shape (alpha channel).
  const { data, info } = await sharp(WORDMARK).resize({ width: 720 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
  const mark = await sharp(data, { raw: info }).png().toBuffer();

  const png = await sharp(Buffer.from(background))
    .composite([{ input: mark, left: 96, top: H - 96 - info.height }])
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
