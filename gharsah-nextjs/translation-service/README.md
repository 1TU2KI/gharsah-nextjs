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

The site runs on Vercel serverless functions. The model and its runtime
(~113 MB model + ~470 MB `node_modules`, ~1 GB RAM while translating) exceed
what a Vercel function can reasonably bundle and cold-start, so the engine
runs on a server you control and the site reaches it over HTTP.

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

## Quality notes

Opus-MT is a general machine translator. Fixed religious phrases are
protected by the website, but **personal names can be mistranslated as
ordinary words** (e.g. «أنس» → "Anse"). Admins should review the English in
the campaign form; any English field typed by hand is kept and never
auto-translated over (until the field is cleared).
