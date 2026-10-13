# Hosting: Cloudflare Pages (since Oct 2026; Replit no longer used)

- **outrr.in** = this repo on Cloudflare Pages.
  - Build command: `node scripts/build-pages.mjs && node scripts/build-seo.mjs` · Output directory: `/` (repo root) · Node 20 (`.nvmrc`)
  - Every push to `main` deploys by itself. The build reads the live catalog, so product pages, `sitemap.xml` and `feed/google.xml` stay current.
  - Daily rebuild 6:00 am IST: `.github/workflows/daily-rebuild.yml` calls the Cloudflare deploy hook (GitHub secret `CF_DEPLOY_HOOK`).
- Never commit generated `p/`, `c/` changes by hand from an old checkout; the build makes them.
- When `store.js` changes, bump `/store.js?v=N` in index.html.
