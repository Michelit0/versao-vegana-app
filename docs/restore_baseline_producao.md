# Restore do baseline de producao

Este procedimento limpa os dados de teste do Supabase e restaura o banco para o ponto da planilha de producao `BD_VERSAO_VEGANA (1).xlsx`.

## Comando principal

```powershell
$env:SUPABASE_DB_PASSWORD="senha_do_banco"
npm run db:restore:production-baseline
```

O script usa por padrao o pooler IPv4:

```text
host=aws-1-us-west-2.pooler.supabase.com
user=postgres.zcfngsbfxtrpiuguydlp
database=postgres
port=5432
```

Por padrao, o comando usa:

```text
C:\Users\micha\Downloads\BD_VERSAO_VEGANA (1).xlsx
```

Para usar outro arquivo:

```powershell
npm run db:restore:production-baseline -- "C:\caminho\arquivo.xlsx"
```

## O que o comando faz

1. Cria backup do Supabase antes de mexer nos dados.
2. Gera o SQL local a partir da planilha.
3. Garante as migrations complementares do sistema.
4. Limpa dados operacionais e historicos de teste.
5. Recarrega clientes, fornecedores, recursos, produtos, receitas, pedidos, itens, compras e cadastros auxiliares da planilha.
6. Mantem a estrutura nova do sistema, incluindo planner, historicos, auditoria e tabelas de seguranca.
7. Cria o responsavel padrao `Pendente Atribuicao`.

## Tabelas limpas no restore

O restore limpa dados destas tabelas, preservando a estrutura:

```text
categorias, tipos_medida, regioes, clientes, fornecedores, recursos,
produtos, receitas, formas_pagamento, pedidos, itens_pedido, compras,
producoes, funcionarios, movimentacoes_estoque, auditoria, atividades,
historico_atividades, responsaveis_atividades, subtarefas_atividades,
historico_subtarefas_atividades
```

## Tabelas preservadas

`perfis` e `auth.users` nao sao limpas por esse comando, porque podem estar relacionadas a login e permissao.

## Quando usar

Use antes de uma rodada grande de testes ou quando os dados ficarem sujos por cadastros, edicoes e exclusoes de homologacao.

Use tambem depois de testar funcionalidades destrutivas, como exclusao logica, alteracao de produtos, alteracao de receitas e planner de atividades.

## Arquivos gerados

O SQL gerado fica em:

```text
supabase/seed/restore_production_baseline.local.sql
```

Esse arquivo e local e nao deve ser versionado, porque representa uma carga operacional derivada da planilha.
