import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const defaultXlsx = "C:\\Users\\micha\\Downloads\\BD_VERSAO_VEGANA (1).xlsx";
const xlsxPath = process.argv[2] || process.env.BASELINE_XLSX || defaultXlsx;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundledPython = "C:\\Users\\micha\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const pythonExecutable = process.env.PYTHON_EXE || bundledPython;
const seedPath = path.join(projectRoot, "supabase", "seed", "production_import.local.sql");
const restorePath = path.join(projectRoot, "supabase", "seed", "restore_production_baseline.local.sql");

const migrationsBeforeRestore = [
  path.join(projectRoot, "supabase", "migrations", "006_atividades_planner.sql"),
  path.join(projectRoot, "supabase", "migrations", "007_responsaveis_subtarefas_atividades.sql")
];

const migrationsAfterRestore = [
  path.join(projectRoot, "supabase", "migrations", "004_rpc_exclusao_logica_cadastros.sql"),
  path.join(projectRoot, "supabase", "migrations", "005_view_cotacao_compras.sql")
];

const truncateTables = [
  "historico_subtarefas_atividades",
  "subtarefas_atividades",
  "historico_atividades",
  "atividades",
  "responsaveis_atividades",
  "auditoria",
  "movimentacoes_estoque",
  "producoes",
  "compras",
  "itens_pedido",
  "pedidos",
  "receitas",
  "produtos",
  "recursos",
  "fornecedores",
  "clientes",
  "formas_pagamento",
  "regioes",
  "tipos_medida",
  "categorias",
  "funcionarios"
];

async function loadLocalEnv() {
  try {
    const text = await fs.readFile(path.join(projectRoot, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2];
    }
  } catch {
    // .env e opcional; credenciais podem vir do ambiente.
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
    const child = spawn(executable, args, { cwd: projectRoot, shell: false, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} terminou com codigo ${code}`));
    });
    child.on("error", reject);
  });
}

function stripTransaction(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*(begin|commit);\s*$/i.test(line))
    .join("\n")
    .trim();
}

function removeIncrementalUpserts(sql) {
  return sql.replace(/\s+on conflict\s*\([^)]+\)\s+do\s+(?:update\s+set\s+[^;]+|nothing)/gi, "");
}

async function connect() {
  await loadLocalEnv();
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("Defina SUPABASE_DB_PASSWORD no ambiente antes de restaurar o baseline.");

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST ?? "aws-1-us-west-2.pooler.supabase.com",
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    user: process.env.SUPABASE_DB_USER ?? "postgres.zcfngsbfxtrpiuguydlp",
    password,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

async function buildRestoreSql() {
  await run(pythonExecutable, ["scripts/generate_production_import_sql.py", xlsxPath, seedPath]);
  const seedSql = removeIncrementalUpserts(stripTransaction(await fs.readFile(seedPath, "utf8")));
  const truncateSql = `truncate table ${truncateTables.map((table) => `public.${table}`).join(",\n  ")} restart identity cascade;`;
  const ensureColumnsSql = [
    "alter table public.produtos add column if not exists rendimento_pessoas numeric(12,3) not null default 20;",
    "alter table public.receitas add column if not exists ordem_preparo integer, add column if not exists origem_hash text;",
    "alter table public.itens_pedido add column if not exists origem_hash text;",
    "alter table public.compras add column if not exists origem_hash text;"
  ].join("\n");
  const ensureConflictIndexesSql = [
    "drop index if exists public.idx_pedidos_id_pedido_unico;",
    "drop index if exists public.idx_receitas_origem_hash_unico;",
    "drop index if exists public.idx_itens_pedido_origem_hash_unico;",
    "drop index if exists public.idx_compras_origem_hash_unico;"
  ].join("\n");
  const restoreSql = [
    "-- Restaura o banco para o baseline da planilha de producao.",
    "-- Gerado automaticamente. Nao versionar este arquivo local.",
    "begin;",
    ensureColumnsSql,
    "",
    truncateSql,
    "",
    ensureConflictIndexesSql,
    "",
    "-- Mantem estrutura nova do planner e cria o responsavel padrao.",
    "insert into public.responsaveis_atividades (nome, sobrenome)",
    "values ('Pendente', 'Atribuicao')",
    "on conflict (nome, sobrenome) do nothing;",
    "",
    seedSql,
    "",
    "commit;"
  ].join("\n");
  await fs.writeFile(restorePath, restoreSql + "\n", "utf8");
}

async function queryCount(client, table) {
  const { rows } = await client.query(`select count(*)::int as total from public.${table}`);
  return rows[0].total;
}

console.log("Criando backup de seguranca antes da restauracao...");
await run(process.execPath, [path.join(projectRoot, "scripts", "export_supabase_backup.mjs")]);

console.log("Gerando SQL baseline a partir da planilha...");
await buildRestoreSql();

const client = await connect();
try {
  console.log("Garantindo migrations complementares...");
  for (const migration of migrationsBeforeRestore) {
    const sql = await fs.readFile(migration, "utf8");
    await client.query(sql);
  }

  console.log("Aplicando restauracao do baseline...");
  await client.query(await fs.readFile(restorePath, "utf8"));

  console.log("Reaplicando indices, auditoria, exclusao logica e views...");
  for (const migration of migrationsAfterRestore) {
    const sql = await fs.readFile(migration, "utf8");
    await client.query(sql);
  }

  const validationTables = ["clientes", "produtos", "receitas", "pedidos", "itens_pedido", "compras", "atividades", "historico_atividades", "responsaveis_atividades", "subtarefas_atividades"];
  for (const table of validationTables) {
    console.log(`${table}: ${await queryCount(client, table)}`);
  }
  console.log(`Baseline restaurado com sucesso usando ${xlsxPath}`);
  console.log(`SQL local gerado em ${restorePath}`);
} finally {
  await client.end();
}
