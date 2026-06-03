# Airbyte: trocar Google Sheets por Supabase

Use este guia para recriar a origem do Airbyte apontando para o banco Postgres do Supabase, sem depender da planilha.

## Dados de conexao

- Host: `db.zcfngsbfxtrpiuguydlp.supabase.co`
- Porta: `5432`
- Banco: `postgres`
- Usuario: `postgres`
- Schema: `public`
- SSL: `require`
- Senha: informe pelo arquivo `.env` local ou pelo campo seguro da interface do Airbyte.

Nao grave a senha real em arquivos versionados.

## Caminho recomendado pela interface

1. Acesse o Airbyte local.
2. Crie uma nova origem do tipo `Postgres`.
3. Preencha os dados acima.
4. Em `Replication method`, escolha `Standard` para comecar simples.
5. Selecione as tabelas do schema `public`.
6. Mantenha o destino BigQuery existente.
7. Crie uma nova conexao `Supabase Postgres -> BigQuery`.
8. Rode uma sincronizacao manual e compare contagens de linhas.
9. Pause a conexao antiga `Google Sheets -> BigQuery` somente depois da validacao.

## Tabelas principais para BI

- `pedidos`
- `itens_pedido`
- `clientes`
- `produtos`
- `recursos`
- `compras`
- `producoes`
- `receitas`
- `fornecedores`
- `formas_pagamento`
- `regioes`
- `vw_vendas_diarias`
- `vw_desempenho_produtos`
- `vw_clientes_rfv`
- `vw_issues_qualidade_dados`

## Validacao minima

- `pedidos`: conferir quantidade total e pedidos do dia.
- `itens_pedido`: conferir se todo item tem `id_pedido`.
- `produtos`: conferir disponibilidade e preco.
- `clientes`: conferir caracteres acentuados.
- `recursos`: conferir estoque e custo unitario.
- Views: conferir se retornam dados depois da primeira venda importada.
