import { getMigrations } from "better-auth/db/migration";
import { auth } from "../lib/auth";
import { getPool, initAppSchema } from "../lib/db";

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);

if (toBeCreated.length > 0 || toBeAdded.length > 0) {
  console.log(
    "better-auth migrations:",
    toBeCreated.map((t) => `+${t.table}`).join(" "),
    toBeAdded.map((t) => `~${t.table}`).join(" "),
  );
  await runMigrations();
} else {
  console.log("better-auth schema up to date");
}

await initAppSchema();
console.log("app schema up to date");

await getPool().end();
