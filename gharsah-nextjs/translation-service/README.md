# Gharsah translation service (self-hosted)

Arabic → English machine translation for the admin panel's campaign fields
(title, subtitle, description). It runs **Opus-MT ar-en** (Helsinki-NLP,
ONNX export `Xenova/opus-mt-ar-en`) locally via `@huggingface/transformers`.
Campaign text is processed only inside this process; after the one-time model
download it needs no internet access at all.

The website calls it from the campaign save / "إعادة إنشاء الترجمة" server
actions (`app/lib/translate.ts`). The website handles all Gharsah-specific
wording itself (memorial phrases, «صدقة جارية», @handles, URLs) and never
stores Arabic as English. If this service is down or not configured, saving
still works, the saved English is kept, and admins can type English by hand.

## Why it is a separate service

The engine is isolated from the website so its model and runtime are never
added to the website's functions. It can run on a small Node server, or in
a separate Vercel project using Fluid Compute / Large Functions (available
since June 2026). The model is ~113 MB, with ~1 GB RAM while translating.
There is no paid translation API; hosting is subject to the provider's quotas.

## Production on Vercel

The dedicated project is `gharsah-translation`. `vercel.json` routes both
endpoints to one function. Build time downloads the model into the bundle;
production inference uses those local files without downloading or writing
to the read-only function filesystem. Node dependencies are installed for
Linux by Vercel, not uploaded from Windows.

- Set `TRANSLATION_ENGINE_KEY` as a production Secret on both projects.
- Set `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` on the engine project.
- Set `TRANSLATION_ENGINE_URL` on the website to the engine's stable alias.
- Deploy the engine from `translation-service/`, then redeploy the website.
- `/health` reports `ready` for a loaded model and `onDemand` on Vercel.
  A cold on-demand instance loads the model at the first authenticated
  `/translate` request. Anonymous translation requests are rejected.
- The function has a 60-second limit; the website retains its shorter
  request timeout and records a retryable error on failure. Overlapping
  inference requests on one instance return 503 rather than exhausting RAM.

## Requirements

- Node.js 20+ (verified locally on Node 24, Windows)
- ~1.5 GB RAM, ~700 MB disk (dependencies + model cache), 1 vCPU is enough
  (≈1 s per campaign on a laptop CPU; no GPU needed)
- Network reachability **from the website** (Vercel) to this service — put it
  behind HTTPS (reverse proxy such as Caddy/Nginx) and always set
  `TRANSLATION_ENGINE_KEY`
- Internet access only once, for `npm run download-model` (or copy the
  `.model-cache/` folder from another machine and set `TRANSLATION_OFFLINE=1`)

## Run

```sh
cd translation-service
npm ci                     # or: npm install
npm run download-model     # one-time, ~113 MB into ./.model-cache
TRANSLATION_ENGINE_KEY=<long-random-secret> TRANSLATION_OFFLINE=1 HOST=0.0.0.0 PORT=8089 npm start
# or, from the website folder (local development): npm run translation-engine
```

Health check: `GET /health` → `{"ok":true,"ready":true,...}`.
Translate: `POST /translate` with header `x-translation-key` and body
`{"texts":["..."]}` → `{"translations":["..."]}`.

| Env var | Default | Meaning |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Interface to listen on (`0.0.0.0` behind a proxy/firewall) |
| `PORT` | `8089` | Port |
| `TRANSLATION_ENGINE_KEY` | — | Shared secret required in `x-translation-key` |
| `TRANSLATION_MODEL` | `Xenova/opus-mt-ar-en` | Model id in the cache |
| `TRANSLATION_DTYPE` | `q8` | `q8` (quantized, smaller) or `fp32` |
| `TRANSLATION_CACHE_DIR` | `./.model-cache` | Model files location |
| `TRANSLATION_OFFLINE` | — | `1` = never touch the network |

The service logs no campaign text (errors log only the error message).

## Website configuration

Set on the website (Vercel project env, or `.env.local` for local dev):

```
TRANSLATION_ENGINE_URL=https://translate.your-server.example
TRANSLATION_ENGINE_KEY=<same secret as the service>
```

`ANTHROPIC_API_KEY` / `ANTHROPIC_TRANSLATE_MODEL` are no longer used.

## How the website uses it (and when it doesn't)

The engine is only one layer (see `app/lib/translate.ts`):

1. **Curated texts** (`app/lib/translation/knownTexts.ts`) — Ehsan's standard
   description templates, hand-checked English.
2. **Cache** (`translation_cache` table) — the same Arabic is never sent twice.
3. **Rules + name dictionary** (`app/lib/translation/rules.ts`, `names.ts`) —
   titles/subtitles like «صدقة جارية عن والد محمد رحمه الله». Works with this
   service offline. A proper name missing from the dictionary is
   transliterated and the translation is published, flagged
   "Review recommended" in the admin. Ordinary words are never transliterated.
4. **This engine** — descriptions and unrecognized titles. Names, @handles,
   links and religious phrases are swapped for placeholders (`XQA`, `XQB`…)
   first and put back afterwards; output with Arabic, lost placeholders,
   repetition or typical filler is rejected as a failure.

Each sentence is translated in its own call: batching sentences of
different lengths made Opus-MT invent filler (e.g. "…him.th.",
", I'm not sure.").

## Quality notes

Opus-MT is a general machine translator. Expect correct meaning with plain
wording for descriptions, but it can still mistranslate rare words or
imperatives (observed: «زوروا» "visit" → "they've visited" in one phrasing).
Names inside descriptions are only protected when they match the campaign's
own title/subtitle subject; other names in free text may be mistranslated.
Admins can always type English by hand; hand-typed English is never
replaced automatically.

## Local isolated testing (no production data)

```sh
node scripts/pglite-test-db.mjs ./.pglite-test 5199       # dev-only test DB
DATABASE_URL=pglite-http://127.0.0.1:5199 GHARSAH_DIST_DIR=.next-test npx next dev -p 3100
```

`pglite-http://` is refused in production builds, on Vercel, and for any
host other than 127.0.0.1/localhost.
