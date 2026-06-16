# Backups do projeto e Supabase

## Codigo do sistema

O backup do codigo versionado roda com:

```powershell
npm run backup:code
```

Ele gera um `.zip` em `backups/code` usando o commit atual do Git. Esse arquivo nao inclui `.env`, `node_modules`, backups locais nem dados reais do banco.

Para salvar direto em uma pasta sincronizada na nuvem:

```powershell
$env:BACKUP_DIR="C:\Users\micha\OneDrive\Backups\versao-vegana"
npm run backup:code
```

## Banco de dados

O backup manual do sistema roda com:

```powershell
npm run backup:supabase
```

Por padrao, os arquivos JSON ficam em `backups/<data-hora>`. Para salvar direto em uma pasta sincronizada na nuvem, defina `BACKUP_DIR` antes de rodar:

```powershell
$env:BACKUP_DIR="C:\Users\micha\OneDrive\Backups\versao-vegana"
npm run backup:supabase
```

Boas praticas:

- Manter uma copia local e uma copia sincronizada em nuvem.
- Nao subir backups com dados reais para repositorio publico.
- Rodar backup antes de importacoes grandes, alteracoes de estrutura ou manutencoes no banco.
- Conferir periodicamente se a pasta de nuvem esta sincronizando de verdade.

Para uma rotina mais forte, crie uma tarefa agendada no Windows executando o comando acima diariamente.

## Backup completo

Quando quiser gerar codigo + dados no mesmo momento:

```powershell
npm run backup:all
```

Antes de qualquer mudanca grande feita por IA, rode:

```powershell
npm run protect:check
npm run backup:all
```
