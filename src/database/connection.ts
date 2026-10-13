import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = path.resolve(process.cwd(), "reconciliation.db");

const db = new Database(databasePath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const schemaPath = path.join(
  process.cwd(),
  "src",
  "database",
  "schema.sql"
);

const schema = fs.readFileSync(schemaPath, "utf8");

db.exec(schema);

export default db;