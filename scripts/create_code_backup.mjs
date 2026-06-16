import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(args) {
  const { stdout } = await execFileAsync("git", args, { cwd: process.cwd() });
  return stdout.trim();
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.resolve(process.env.BACKUP_DIR || "backups", "code");
await fs.mkdir(backupRoot, { recursive: true });

const commit = await git(["rev-parse", "--short", "HEAD"]);
const branch = await git(["branch", "--show-current"]);
const status = await git(["status", "--short"]);

if (status) {
  console.warn("Atencao: existem alteracoes locais nao commitadas. O zip usa apenas o ultimo commit.");
  console.warn(status);
}

const baseName = `versao-vegana-code-${stamp}-${commit}`;
const zipPath = path.join(backupRoot, `${baseName}.zip`);
const infoPath = path.join(backupRoot, `${baseName}.restore-info.txt`);

await execFileAsync("git", ["archive", "--format=zip", "--output", zipPath, "HEAD"], { cwd: process.cwd() });

const info = [
  `Projeto: versao-vegana-app`,
  `Branch: ${branch || "sem-branch"}`,
  `Commit: ${commit}`,
  `Criado em: ${new Date().toISOString()}`,
  "",
  "Restauracao rapida:",
  `git checkout ${commit}`,
  "",
  "Este arquivo zip contem somente arquivos versionados pelo Git.",
  "Ele nao inclui node_modules, .env, backups locais nem dados reais do banco."
].join("\n");

await fs.writeFile(infoPath, info, "utf8");

console.log(`Backup do codigo salvo em ${zipPath}`);
console.log(`Guia de restauracao salvo em ${infoPath}`);
