// Fold a built `/export` page into one self-contained file: stylesheets become
// `<style>`, the latin Archivo subset becomes a data: URI, and the other two
// subsets are dropped (D-CLI-6). There are no image assets and no JS bundles, so
// after this pass the document has no external reference left.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LATIN = 'archivo-latin-wght-normal';

// `@font-face{…}` never nests, so a non-greedy block match is exact here.
function foldFonts(css, woff2) {
  return css.replace(/@font-face\{[^}]*\}/g, (block) => {
    if (!block.includes(LATIN)) return '';
    return block.replace(/url\([^)]*\)/, `url(data:font/woff2;base64,${woff2})`);
  });
}

export async function inlineExport(distDir) {
  const asset = (href) => join(distDir, href.replace(/^\//, ''));
  const file = join(distDir, 'export', 'index.html');
  let html = await readFile(file, 'utf8');

  // Stylesheets, read once and kept in document order — the cascade depends on it.
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g)];
  const sheets = await Promise.all(links.map(([, href]) => readFile(asset(href), 'utf8')));

  const match = /\/_astro\/(archivo-latin-wght-normal[^"')]*\.woff2)/.exec(sheets.join('\n'));
  if (!match) throw new Error('the latin Archivo subset is missing from the build');
  const woff2 = (await readFile(join(distDir, '_astro', match[1]))).toString('base64');

  for (const [i, [tag]] of links.entries()) {
    html = html.replace(tag, `<style>${foldFonts(sheets[i], woff2)}</style>`);
  }

  // Astro inlines the client script at this size, but a future bundle would land
  // here as a src= instead, and the artifact has to keep working either way.
  const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)];
  for (const [tag, src] of scripts) {
    const js = await readFile(asset(src), 'utf8');
    html = html.replace(tag, `<script type="module">${js}</script>`);
  }

  const left = [...html.matchAll(/(?:src|href)="(\/_astro\/[^"]*)"/g)].map((m) => m[1]);
  if (left.length) throw new Error(`export still references ${left.join(', ')}`);

  // Every document is unique on a route and repeated in the export, so a hard-coded
  // id survives the served site and collides only here. Fail the export instead.
  const seen = new Set();
  const dupes = new Set();
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  if (dupes.size) throw new Error(`duplicate id in export: ${[...dupes].join(', ')}`);

  return html;
}
