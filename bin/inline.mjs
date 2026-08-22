// Fold a built `/export` page into one self-contained file: stylesheets become
// `<style>`, the latin Archivo subset becomes a data: URI, and the other two
// subsets are dropped (D-CLI-6). There are no image assets, so after this pass
// the document has no external reference left.
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

// Code two client scripts share is split into a chunk of its own, which the
// entry scripts then import by a URL relative to `/_astro/`. Inlining the
// entries moves them to the document's own base, where that URL names a file the
// single artifact does not carry — so both scripts fail to load and the page
// keeps its markup and loses every interaction.
//
// The specifier cannot be rewritten to carry the chunk either: a `data:` or
// `blob:` module URL loads from `file://` but is an off-origin script to a host
// that serves the export under a Content-Security-Policy, and `script-src` lists
// neither. So there is no import left to resolve — every chunk and every entry
// is concatenated into one module, which is inline, and inline is the one form a
// strict policy still admits.
const RELATIVE = /(["'])(\.\/[^"']+\.js)\1/g;
const EXPORTS = /export\s*\{([^}]*)\}\s*;?/g;

// Rollup gives a chunk exactly one `export{…}`, at the end. Anything else is a
// shape this pass would mistranslate, so it stops instead.
function chunkExports(name, js) {
  const found = [...js.matchAll(EXPORTS)];
  if (found.length !== 1) throw new Error(`script chunk ${name} has ${found.length} export statements, expected 1`);
  const fields = found[0][1].split(',').map((pair) => {
    const [local, exported = local] = pair.split(/\s+as\s+/).map((t) => t.trim());
    if (!/^[A-Za-z_$][\w$]*$/.test(local) || !/^[A-Za-z_$][\w$]*$/.test(exported)) {
      throw new Error(`script chunk ${name} exports an unsupported binding: ${pair.trim()}`);
    }
    return `${exported}:${local}`;
  });
  return { body: js.replace(EXPORTS, ''), fields: fields.join(',') };
}

// Each chunk becomes one closure evaluated once, so the single instance every
// importer shared as a module is still a single instance here. Each importer's
// own body is a closure too — as separate modules their top-level names never
// met, and concatenation is what would introduce the collision.
async function bundle(asset, entries) {
  const order = [];
  const ids = new Map();

  const collect = async (js, chain) => {
    for (const spec of new Set([...js.matchAll(RELATIVE)].map((m) => m[2]))) {
      const name = spec.slice(2);
      if (chain.includes(name)) throw new Error(`circular script chunk: ${[...chain, name].join(' -> ')}`);
      if (ids.has(name)) continue;
      const chunk = await readFile(asset(`/_astro/${name}`), 'utf8');
      const inner = await collect(chunk, [...chain, name]);
      const id = `__c${ids.size}`;
      // Registered after the recursion, so a dependency is always defined first.
      ids.set(name, id);
      const { body, fields } = chunkExports(name, inner);
      order.push(`const ${id}=(()=>{${body}\nreturn{${fields}};})();`);
    }
    return js.replace(
      /import\s*\{([^}]*)\}\s*from\s*(["'])(\.\/[^"']+\.js)\2\s*;?/g,
      (_m, bindings, _q, spec) => `const{${bindings.replace(/\s+as\s+/g, ':')}}=${ids.get(spec.slice(2))};`,
    );
  };

  const bodies = [];
  for (const js of entries) bodies.push(await collect(js, []));
  return [...order, ...bodies.map((body) => `(()=>{${body}})();`)].join('\n');
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
  const woff2 = (await readFile(asset(`/_astro/${match[1]}`))).toString('base64');

  for (const [i, [tag]] of links.entries()) {
    html = html.replace(tag, `<style>${foldFonts(sheets[i], woff2)}</style>`);
  }

  // Astro inlines the client script at this size, but a future bundle would land
  // here as a src= instead, and the artifact has to keep working either way — so
  // the src= form comes inline first and one pass then folds every script body,
  // whichever way it arrived.
  const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)];
  for (const [tag, src] of scripts) {
    const js = await readFile(asset(src), 'utf8');
    html = html.replace(tag, () => `<script type="module">${js}</script>`);
  }
  // The entries are collected in document order and re-emitted as one script at
  // the end of the body. A module script is deferred wherever it sits, so the
  // move changes nothing about when it runs or what it can see — and the last
  // entry Astro writes lands after `</html>`, which the single file should not
  // carry.
  const inline = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  const js = await bundle(asset, inline.map(([, body]) => body));
  for (const [tag] of inline) html = html.replace(tag, '');
  html = html.replace('</body>', () => `<script type="module">${js}</script></body>`);

  // A dangling module specifier is only a fault inside a script. The same string
  // in a team's own prose — a guide naming `./setup.js` — is just a file name,
  // and failing the export over it would be a build error pointing at nothing.
  const left = [
    ...[...html.matchAll(/(?:src|href)="(\/_astro\/[^"]*)"/g)].map((m) => m[1]),
    ...[...js.matchAll(RELATIVE)].map((m) => m[2]),
    ...[...js.matchAll(/["'](\/_astro\/[^"']+)["']/g)].map((m) => m[1]),
  ];
  if (left.length) throw new Error(`export still references ${[...new Set(left)].join(', ')}`);

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
