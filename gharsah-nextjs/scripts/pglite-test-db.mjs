// Local, isolated test database for development (never production).
//
// Runs PGlite (in-process Postgres, a devDependency) in THIS single process
// and accepts queries from the Next dev server over HTTP on 127.0.0.1 only.
// Next's dev server spreads work over several processes; opening one PGlite
// folder from more than one of them corrupts it, so this process owns it.
//
//   node scripts/pglite-test-db.mjs <data-dir> [port=5199]
//   DATABASE_URL=pglite-http://127.0.0.1:5199 npx next dev -p 3100
//
// The app creates the schema and seeds it on first use (app/lib/db/client.ts).

import { createServer } from "node:http";
import { PGlite } from "@electric-sql/pglite";

const dir = process.argv[2];
const port = Number(process.argv[3] || 5199);
if (!dir) {
  console.error("usage: node scripts/pglite-test-db.mjs <data-dir> [port]");
  process.exit(1);
}

const db = new PGlite(dir);
await db.waitReady;

const server = createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST" || req.url !== "/query") return send(404, { error: "not found" });
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const { text, params } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const result = await db.query(text, Array.isArray(params) ? params : []);
    send(200, { rows: result.rows });
  } catch (error) {
    send(500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`PGlite test database (${dir}) on http://127.0.0.1:${port}`));

const shutdown = async () => {
  server.close();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
