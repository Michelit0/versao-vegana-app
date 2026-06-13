import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnv() {
  try {
    const text = await fs.readFile(".env", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2];
    }
  } catch {
    // .env e opcional; em producao as variaveis podem vir do ambiente.
  }
}

await loadLocalEnv();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.");
}

const supabase = createClient(url, anonKey);
const tables = [
  "categorias",
  "tipos_medida",
  "regioes",
  "clientes",
  "fornecedores",
  "recursos",
  "produtos",
  "receitas",
  "formas_pagamento",
  "pedidos",
  "itens_pedido",
  "compras",
  "producoes",
  "funcionarios"
];

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = process.env.BACKUP_DIR || "backups";
const outputDir = path.resolve(backupRoot, stamp);
await fs.mkdir(outputDir, { recursive: true });

for (const table of tables) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  await fs.writeFile(path.join(outputDir, `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
  console.log(`${table}: ${rows.length}`);
}

console.log(`Backup salvo em ${outputDir}`);
