import { defineConfig } from 'astro/config';

export default defineConfig({
  // Astro's dev toolbar sits in the same bottom-center slot as the impeccable live bar.
  devToolbar: { enabled: false },
  // The CLI renders a team folder against this package's own root, which may be
  // read-only under a global install — so it redirects the cache somewhere writable.
  ...(process.env.AISDLC_CACHE_DIR ? { cacheDir: process.env.AISDLC_CACHE_DIR } : {}),
});
