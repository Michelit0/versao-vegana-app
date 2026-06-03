# Seed inicial

Esta pasta recebe arquivos gerados a partir do backup `.xlsx`.

Use:

```bash
python scripts/import_xlsx_to_seed.py "C:\Users\micha\Downloads\BD_VERSAO_VEGANA Backup 2026-05-29.xlsx"
```

O script gera `supabase/seed/initial_data.sql` com inserts em tabelas e colunas em portugues, minusculas e sem acentuacao.
