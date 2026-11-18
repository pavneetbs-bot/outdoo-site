# Hosting: Cloudflare Pages (since Oct 2026; Replit no longer used)

- **outrr.in** = this repo on Cloudflare Pages.
  - Build command: `node scripts/build-pages.mjs && node scripts/build-seo.mjs` · Output directory: `/` (repo root) · Node 20 (`.nvmrc`)
  - Every push to `main` deploys by itself. The build reads the live catalog, so product pages, `sitemap.xml` and `feed/google.xml` stay current.
  - Rebuild twice a day (6:00 am + 6:00 pm IST): `.github/workflows/daily-rebuild.yml` calls the Cloudflare deploy hook (GitHub secret `CF_DEPLOY_HOOK`).
  - SEO footer (`scripts/footer.mjs`): made on every build from the live catalogue + AI homepage picks (categories by interest, Ready to ship / Made to order split, popular sub-categories, AI searches else Place × type phrases, design studio, trending, partner pages) and put into index.html, product.html, the policy pages and every /p/ /c/ page. No hand lists — a new category / sub-category / studio shows after the next build.
- Never commit generated `p/`, `c/` changes by hand from an old checkout; the build makes them.
- When `store.js` changes, bump `/store.js?v=N` in index.html.
