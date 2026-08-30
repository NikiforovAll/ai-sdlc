import { defineConfig } from 'astro/config';
import annotate from './src/integrations/annotate.ts';

export default defineConfig({
  // The annotation write path. Its only hook is `astro:server:setup`, so it is
  // inert in a build — `export` carries no annotation layer (D-ANN-5).
  integrations: [annotate()],
  // A project site on GitHub Pages is served from `/<repo>/`, not from the root.
  // The CLI never sets this, so `serve`, `export` and `npm run dev` stay at `/`.
  ...(process.env.AISDLC_BASE ? { base: process.env.AISDLC_BASE } : {}),
  // Astro's dev toolbar sits in the same bottom-center slot as the impeccable live bar.
  devToolbar: { enabled: false },
  // The CLI renders a team folder against this package's own root, which may be
  // read-only under a global install — so it redirects the cache somewhere writable.
  ...(process.env.AISDLC_CACHE_DIR ? { cacheDir: process.env.AISDLC_CACHE_DIR } : {}),
});
