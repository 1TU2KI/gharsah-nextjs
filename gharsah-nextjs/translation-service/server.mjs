// Gharsah self-hosted translation engine (Arabic -> English).
//
// A deliberately small HTTP service around Opus-MT ar-en (Helsinki-NLP,
// ONNX export "Xenova/opus-mt-ar-en") running locally through
// @huggingface/transformers. The model is downloaded once into the local
// cache; after that no network access is needed, and campaign text is only
// ever processed in this process — it is never sent to any third party.
//
// It only translates plain text segments. Everything Gharsah-specific —
// fixed memorial phrases, @handles, URLs — is handled by the app before
// calling it (app/lib/translate.ts), so those are never machine-translated.
//
// API (JSON):
//   GET  /health            -> { ok: true, model, ready }
//   POST /translate         { texts: string[] } -> { translations: string[] }
//        header x-translation-key: <TRANSLATION_ENGINE_KEY>  (when set)
//
// Env:
//   HOST (default 127.0.0.1)  PORT (default 8089)
//   TRANSLATION_ENGINE_KEY    shared secret; strongly recommended
//   TRANSLATION_MODEL         default Xenova/opus-mt-ar-en
//   TRANSLATION_DTYPE         default q8 (quantized; fp32 for max quality)
//   TRANSLATION_CACHE_DIR     default ./.model-cache
//   TRANSLATION_OFFLINE=1     never touch the network (model must be cached)
//
// `node server.mjs --download-only` fetches the model into the cache and exits.

import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { env, pipeline } from "@huggingface/transformers";

const here = dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8089);
const KEY = process.env.TRANSLATION_ENGINE_KEY || "";
const MODEL = process.env.TRANSLATION_MODEL || "Xenova/opus-mt-ar-en";
const DTYPE = process.env.TRANSLATION_DTYPE || "q8";

env.cacheDir = process.env.TRANSLATION_CACHE_DIR || join(here, ".model-cache");
env.allowRemoteModels = process.env.TRANSLATION_OFFLINE !== "1";

const MAX_TEXTS = 50;
const MAX_CHARS = 5000; // per text; campaign fields are far shorter

let translatorPromise = null;
let ready = false;
function getTranslator() {
  if (!translatorPromise) {
    translatorPromise = pipeline("translation", MODEL, { dtype: DTYPE }).then((t) => {
      ready = true;
      return t;
    });
    translatorPromise.catch(() => {
      translatorPromise = null; // allow a later retry
    });
  }
  return translatorPromise;
}

/** Opus-MT works best sentence by sentence; split on sentence ends and line breaks, keep each separator. */
function splitSentences(text) {
  return text
    .split(/(?<=[.!?؟])\s+|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function translateTexts(texts) {
  const translator = await getTranslator();
  const out = [];
  for (const text of texts) {
    const sentences = splitSentences(text);
    if (sentences.length === 0) {
      out.push("");
      continue;
    }
    // One sentence per call: batching sentences of different lengths pads
    // the shorter ones, and Opus-MT then invents filler at their edges
    // (observed: "…him.th.", ", I'm not sure."). Campaign texts are short,
    // so the extra calls cost little.
    const translated = [];
    for (const sentence of sentences) {
      const [result] = await translator(sentence, { max_new_tokens: 256 });
      translated.push(String(result?.translation_text ?? "").trim());
    }
    out.push(translated.join(" ").trim());
  }
  return out;
}

function keyMatches(provided) {
  if (!KEY) return true;
  const a = Buffer.from(String(provided || ""));
  const b = Buffer.from(KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req, limit = 256 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("payload too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

if (process.argv.includes("--download-only")) {
  console.log(`Downloading ${MODEL} (${DTYPE}) into ${env.cacheDir} ...`);
  await getTranslator();
  console.log("Model ready.");
  process.exit(0);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true, model: MODEL, dtype: DTYPE, ready });
    }
    if (req.method === "POST" && req.url === "/translate") {
      if (!keyMatches(req.headers["x-translation-key"])) return send(res, 401, { error: "unauthorized" });
      const body = await readJson(req);
      const texts = body?.texts;
      if (
        !Array.isArray(texts) ||
        texts.length > MAX_TEXTS ||
        !texts.every((t) => typeof t === "string" && t.length <= MAX_CHARS)
      ) {
        return send(res, 400, { error: `expected { texts: string[] } (max ${MAX_TEXTS} items, ${MAX_CHARS} chars each)` });
      }
      const translations = await translateTexts(texts);
      return send(res, 200, { translations });
    }
    return send(res, 404, { error: "not found" });
  } catch (error) {
    // Never echo the submitted text back in errors or logs.
    console.error("translate failed:", error instanceof Error ? error.message : error);
    return send(res, 500, { error: "translation failed" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Gharsah translation engine on http://${HOST}:${PORT} (model ${MODEL}, ${DTYPE})`);
  if (!KEY) console.warn("TRANSLATION_ENGINE_KEY is not set — only run like this on a private interface.");
  // Warm the model in the background so the first admin request is fast.
  getTranslator().catch((e) => console.error("model load failed:", e instanceof Error ? e.message : e));
});
