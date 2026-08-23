/**
 * Local Postgres without Docker (Windows-friendly).
 * Keeps process alive so the API can connect on port 5433.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.EMBEDDED_PG_PORT || 5433);
const USER = process.env.EMBEDDED_PG_USER || "darkhorse";
const PASSWORD = process.env.EMBEDDED_PG_PASSWORD || "darkhorse";
const DB = process.env.EMBEDDED_PG_DB || "dark_horse_safety";

const pg = new EmbeddedPostgres({
  databaseDir: path.join(__dirname, "..", ".data", "pg"),
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

console.log(`Initialising embedded Postgres on :${PORT}…`);
try {
  await pg.initialise();
} catch (err) {
  console.log("init note:", err?.message || err);
}

await pg.start();
console.log("Embedded Postgres started");

try {
  await pg.createDatabase(DB);
  console.log(`Database created: ${DB}`);
} catch (err) {
  console.log(`Database ready: ${DB} (${err?.message || "exists"})`);
}

console.log(
  `DATABASE_URL=postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB}?schema=public`,
);
console.log("Keeping process alive — Ctrl+C to stop.");

const shutdown = async () => {
  try {
    await pg.stop();
  } catch (_) {}
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await new Promise(() => {});
