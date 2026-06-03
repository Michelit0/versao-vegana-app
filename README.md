# Versao Vegana App

Sistema web para substituir a operacao em planilha por uma aplicacao com banco Postgres/Supabase.

## Stack

- React + Vite + TypeScript
- Supabase Postgres
- Supabase Auth e Row Level Security
- Seed inicial gerado a partir do backup `BD_VERSAO_VEGANA Backup 2026-05-29.xlsx`

## Rodar localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Enquanto `.env` nao estiver configurado, o app abre em modo demo com dados locais.

## Criar banco no Supabase

1. Crie um projeto gratuito no Supabase.
2. Rode o SQL de `supabase/migrations/001_initial_schema.sql`.
3. Gere o seed a partir do backup:

```bash
python scripts/import_xlsx_to_seed.py "C:\Users\micha\Downloads\BD_VERSAO_VEGANA Backup 2026-05-29.xlsx"
```

4. Rode `supabase/seed/initial_data.sql` no SQL Editor do Supabase.
5. Copie a URL e anon key para `.env`.

## Principais telas

- Painel do dia
- Nova venda
- Historico de pedidos
- Clientes
- Produtos
- Sistema/ambiente

## Estrutura preservada da planilha

As abas antigas foram mapeadas para tabelas relacionais:

- `Produtos` -> `produtos`
- `Recursos` -> `recursos`
- `Receitas` -> `receitas`
- `Pedidos` -> `pedidos`
- `Itens Pedido` -> `itens_pedido`
- `Compras` -> `compras`
- `Fornecedores` -> `fornecedores`
- `Forma Pagamento` -> `formas_pagamento`
- `Clientes` -> `clientes`
- `Regioes` -> `regioes`
- `Funcionarios` -> `funcionarios`
- `Categorias` -> `categorias`
- `Tipo Medida` -> `tipos_medida`
- `Producao` -> `producoes`

As colunas do banco ficam em portugues, minusculas e sem acentuacao.
