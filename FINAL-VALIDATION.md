# NutriTrace v2.1 — Final validation

Build: 2026-08-18

## Passed

- JavaScript syntax: `app.js`, `sw.js`, `api/nutrition-enrich.js`, `api/parse-food-entry.js`.
- Runtime manifest/index: 38.072 foods, 64/64 chunks.
- Numeric values: 1.341.239.
- Explicit N/D: 28.216.
- Grade totals: A 3.708, B 20.576, C 1.316.193, D 762.
- All index IDs resolve to their declared chunk.
- All 131 runtime checksum entries match.
- `.json.gz` files decompress byte-for-byte to their `.json` counterparts.
- Banana regression: vitamin A RAE 4 µg; B5 0.334 mg; iodine N/D.
- Dark chocolate 70–85% regression: copper 1.76 mg; vitamin K 7.3 µg.
- Deficiency code excludes Master grade D and AI estimates.
- Runtime C contributes only through the existing >=65% data-coverage classification policy.
- New service-worker cache namespace: `nutritrace-v21-runtime-audited`.
- No embedded OpenRouter secret found.
- No residual `OPENAI_API_KEY` / `api.openai.com` client references.
- Static HTTP smoke test passed for core app files, manifest, index and chunk 00.

## Browser smoke limitation

A Chromium visual smoke test could not complete in the build sandbox because external DNS resolution for the React/ReactDOM/SheetJS CDNs is unavailable there. This is an environment limitation, not a detected application error. Final visual/iOS PWA verification must therefore be performed on the Vercel deployment.
