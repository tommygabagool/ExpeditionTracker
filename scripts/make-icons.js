// Generates all SWITCHBACK brand assets from one SVG mark.
// Run: npm run icons   (rebuild the dev client afterward — icons are native assets)
//
// Mark: WPA-poster mountain, gold sun, switchback trail zigzagging to a
// snowfield summit. Palette = src/constants/theme.ts Ranger Poster tokens.
const sharp = require('sharp');
const path = require('path');

const CREAM = '#F2ECDC';
const INK = '#2C2A20';
const PINE = '#2F5233';
const SUNSET = '#C75B39';
const GOLD = '#C99C3C';

const TRAIL = '594,901 205,778 778,635 328,491 594,369 512,225';

const MOUNTAIN = 'M82 901 L512 164 L942 901 Z';

// The mark in a 1024 box (no background). Trail clips to the mountain so no
// stroke dangles outside the silhouette.
function mark({ mono = false } = {}) {
  if (mono) {
    // Android monochrome: white silhouette, trail punched out via mask.
    return `
      <clipPath id="mt-m"><path d="${MOUNTAIN}"/></clipPath>
      <mask id="cut">
        <rect x="0" y="0" width="1024" height="1024" fill="white"/>
        <g clip-path="url(#mt-m)">
          <polyline points="${TRAIL}" fill="none" stroke="black" stroke-width="64"
            stroke-linejoin="round" stroke-linecap="round"/>
        </g>
      </mask>
      <circle cx="737" cy="266" r="133" fill="white"/>
      <path d="${MOUNTAIN}" fill="white" mask="url(#cut)"/>`;
  }
  return `
    <clipPath id="mt"><path d="${MOUNTAIN}"/></clipPath>
    <circle cx="737" cy="266" r="133" fill="${GOLD}" stroke="${INK}" stroke-width="16"/>
    <path d="${MOUNTAIN}" fill="${PINE}" stroke="${INK}" stroke-width="20"
      stroke-linejoin="round"/>
    <g clip-path="url(#mt)">
      <polyline points="${TRAIL}" fill="none" stroke="${INK}" stroke-width="72"
        stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${TRAIL}" fill="none" stroke="${CREAM}" stroke-width="44"
        stroke-linejoin="round" stroke-linecap="round"/>
    </g>
    <path d="M512 164 L635 379 L586 337 L512 400 L438 337 L389 379 Z"
      fill="${CREAM}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>`;
}

function svg(inner) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${inner}</svg>`,
  );
}

// Full app icon: cream field, sunset ground band the mountain stands on,
// the mark, ink poster frame drawn last so its edges stay clean.
const appIcon = svg(`
  <rect width="1024" height="1024" fill="${CREAM}"/>
  <rect x="57" y="796" width="910" height="171" fill="${SUNSET}"/>
  <rect x="57" y="796" width="910" height="14" fill="${INK}"/>
  <g transform="translate(112,92) scale(0.78125)">${mark()}</g>
  <rect x="44" y="44" width="936" height="936" fill="none" stroke="${INK}" stroke-width="26"/>
`);

// Android adaptive foreground: mark alone in the 66% safe zone, transparent bg.
const adaptiveFg = svg(`<g transform="translate(215,215) scale(0.58)">${mark()}</g>`);
const adaptiveBg = svg(`<rect width="1024" height="1024" fill="${CREAM}"/>`);
const adaptiveMono = svg(`<g transform="translate(215,215) scale(0.58)">${mark({ mono: true })}</g>`);

// Splash: mark on transparency (splash background is cream via app.json).
const splash = svg(`<g transform="translate(112,92) scale(0.78125)">${mark()}</g>`);

const out = (f) => path.join(__dirname, '..', 'assets', 'images', f);

async function main() {
  await sharp(appIcon).png().toFile(out('icon.png'));
  await sharp(adaptiveFg).png().toFile(out('android-icon-foreground.png'));
  await sharp(adaptiveBg).png().toFile(out('android-icon-background.png'));
  await sharp(adaptiveMono).png().toFile(out('android-icon-monochrome.png'));
  await sharp(splash).png().toFile(out('splash-icon.png'));
  await sharp(appIcon).resize(48, 48).png().toFile(out('favicon.png'));
  console.log('SWITCHBACK assets written: icon, adaptive fg/bg/mono, splash, favicon');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
