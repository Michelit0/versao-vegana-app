import fs from "node:fs/promises";
import { Client } from "pg";

const sqlPath = process.argv[2];

if (!sqlPath) {
  throw new Error("Informe o caminho do arquivo SQL. Ex.: node scripts/apply_sql.mjs supabase/migrations/003_operacao_receitas_eventos_auditoria.sql");
}

const password = process.env.SUPABASE_DB_PASSWORD;
const host = process.env.SUPABASE_DB_HOST ?? "aws-0-us-west-2.pooler.supabase.com";
const user = process.env.SUPABASE_DB_USER ?? "postgres.zcfngsbfxtrpiuguydlp";
const database = process.env.SUPABASE_DB_NAME ?? "postgres";
const port = Number(process.env.SUPABASE_DB_PORT ?? 5432);

if (!password) {
  throw new Error("Defina SUPABASE_DB_PASSWORD no ambiente antes de aplicar SQL.");
}

const sql = await fs.readFile(sqlPath, "utf8");
const client = new Client({
  host,
  port,
  database,
  user,
  password,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
try {
  await client.query(sql);
  console.log(`SQL aplicado com sucesso: ${sqlPath}`);
} finally {
  await client.end();
}
