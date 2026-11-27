// 195: protect the studio / planner code on the live site — Cloudflare Pages builds only (CF_PAGES is set there).
// Minifies the deployed copies in place; the repo keeps the readable source. If esbuild isn't installed the step is skipped.
import fs from 'node:fs'
import path from 'node:path'

const FILES = [['mto.js', 'script'], ['roofmap.js', 'script'], ['planner.js', 'esm'], ['space3d.js', 'esm'], ['cabin3d.js', 'esm'], ['pergola3d.js', 'esm'], ['terrace-match.js', 'esm'], ['plan2d.js', 'esm'], ['plants3d.js', 'esm'], ['floorlay.js', 'esm'], ['studio3d.js', 'esm'], ['proposal.js', 'esm'], ['cadread.js', 'esm'], ['bar3d.js', 'esm'], ['fw3d.js', 'esm'], ['bench3d.js', 'esm'], ['rail3d.js', 'esm']]
if (!process.env.CF_PAGES && !process.env.FORCE_MINIFY) { console.log('minify: skipped (not a Cloudflare Pages build)'); process.exit(0) }
let esbuild
try { esbuild = await import('esbuild') } catch (e) { console.log('minify: esbuild not installed — skipped'); process.exit(0) }
const root = process.env.MINIFY_DIR || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
for (const [f, kind] of FILES) {
  const p = path.join(root, f); if (!fs.existsSync(p)) continue
  const src = fs.readFileSync(p, 'utf8')
  try {
    // classic scripts: top-level names stay (other scripts and inline handlers use them); modules: exports stay
    const out = await esbuild.transform(src, { loader: 'js', minify: true, legalComments: 'none', target: 'es2019', ...(kind === 'esm' ? { format: 'esm' } : {}) })
    fs.writeFileSync(p, `/* © outrr.in — all rights reserved. Copying, scraping or reverse-engineering this code is not allowed (see /terms). */\n` + out.code)
    console.log(`minify: ${f} ${src.length} → ${out.code.length}`)
  } catch (e) { console.log(`minify: ${f} left as is (${e.message.split('\n')[0]})`) }
}
