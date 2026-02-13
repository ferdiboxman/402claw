import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CSV_API_DIR = "/Users/Shared/Projects/402claw/prototypes/csv-api";
const WRANGLER_CONFIG = path.join(CSV_API_DIR, "wrangler.d1.local.toml");
const MIGRATION_SQL = path.join(CSV_API_DIR, "migrations/0001_initial.sql");

function runWrangler(args, { cwd } = {}) {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: cwd || CSV_API_DIR,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `wrangler command failed: npx wrangler ${args.join(" ")}`,
        result.stderr || "",
        result.stdout || "",
      ].join("\n"),
    );
  }

  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

test("wrangler d1 local migration executes and schema is queryable", {
  skip: process.env.RUN_WRANGLER_D1_INTEGRATION !== "1",
}, () => {
  const persistDir = fs.mkdtempSync(path.join(os.tmpdir(), "402claw-wrangler-d1-"));

  runWrangler([
    "d1",
    "execute",
    "CONTROL_DB",
    "--local",
    "--persist-to",
    persistDir,
    "--config",
    WRANGLER_CONFIG,
    "--file",
    MIGRATION_SQL,
  ]);

  const schemaOutput = runWrangler([
    "d1",
    "execute",
    "CONTROL_DB",
    "--local",
    "--persist-to",
    persistDir,
    "--config",
    WRANGLER_CONFIG,
    "--command",
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
  ]);

  for (const tableName of ["tenants", "users", "api_keys", "ledger", "audit_log"]) {
    assert.match(schemaOutput, new RegExp(`\\b${tableName}\\b`, "i"));
  }
});
