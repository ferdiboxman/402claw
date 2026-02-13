import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(
  "/Users/Shared/Projects/402claw/prototypes/csv-api/migrations/0001_initial.sql",
);

function readSchema() {
  return fs.readFileSync(SCHEMA_PATH, "utf8");
}

function extractTableBlock(sql, tableName) {
  const pattern = new RegExp(
    `CREATE TABLE IF NOT EXISTS\\s+${tableName}\\s*\\(([^;]+)\\);`,
    "i",
  );
  const match = sql.match(pattern);
  assert.ok(match, `missing CREATE TABLE for ${tableName}`);
  return match[1].toLowerCase();
}

test("D1 schema creates required Phase 1 tables", () => {
  const sql = readSchema();

  for (const tableName of ["tenants", "users", "api_keys", "ledger", "audit_log"]) {
    assert.match(
      sql,
      new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${tableName}\\b`, "i"),
      `expected table ${tableName}`,
    );
  }
});

test("D1 schema includes required columns per table", () => {
  const sql = readSchema();

  const tenants = extractTableBlock(sql, "tenants");
  for (const column of ["id", "slug", "owner_id", "config", "created_at", "updated_at"]) {
    assert.match(tenants, new RegExp(`\\b${column}\\b`, "i"));
  }

  const users = extractTableBlock(sql, "users");
  for (const column of ["id", "email", "wallet_address", "created_at"]) {
    assert.match(users, new RegExp(`\\b${column}\\b`, "i"));
  }

  const apiKeys = extractTableBlock(sql, "api_keys");
  for (const column of ["id", "user_id", "key_hash", "scopes", "created_at", "revoked_at"]) {
    assert.match(apiKeys, new RegExp(`\\b${column}\\b`, "i"));
  }

  const ledger = extractTableBlock(sql, "ledger");
  for (const column of ["id", "tenant_id", "type", "amount", "metadata", "created_at"]) {
    assert.match(ledger, new RegExp(`\\b${column}\\b`, "i"));
  }

  const auditLog = extractTableBlock(sql, "audit_log");
  for (const column of ["id", "user_id", "action", "metadata", "created_at"]) {
    assert.match(auditLog, new RegExp(`\\b${column}\\b`, "i"));
  }
});

test("wrangler example documents CONTROL_DB D1 binding", () => {
  const wranglerExamplePath = path.resolve(
    "/Users/Shared/Projects/402claw/prototypes/csv-api/wrangler.example.toml",
  );
  const wranglerExample = fs.readFileSync(wranglerExamplePath, "utf8");

  assert.match(wranglerExample, /\[\[d1_databases\]\]/i);
  assert.match(wranglerExample, /binding\s*=\s*"CONTROL_DB"/i);
  assert.match(wranglerExample, /database_name\s*=\s*"clawr-prod"/i);
});
