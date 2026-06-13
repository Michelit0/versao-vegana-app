# Backups do Supabase

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
