# Seguranca e migracao

## Seguranca

- O banco usa Row Level Security.
- Usuarios autenticados podem ler dados operacionais.
- `operacao` pode criar/atualizar pedidos e itens.
- `admin` pode gerenciar produtos, clientes, recursos e configuracoes.
- `consulta` pode acompanhar dados sem editar.

Antes de producao, criar usuarios no Supabase Auth e inserir cada um em `profiles`.

## Migracao sem quebrar nada

1. Guardar a planilha original como backup somente leitura.
2. Criar banco com `001_initial_schema.sql`.
3. Gerar seed com `scripts/import_xlsx_to_seed.py`.
4. Conferir totais:
   - quantidade de pedidos
   - soma de `VALOR_FINAL`
   - quantidade de produtos
   - quantidade de clientes
5. Liberar o app para lancamentos novos.
6. Deixar a planilha antiga apenas para consulta por alguns dias.
7. Depois conectar BI diretamente no Postgres/Supabase.

## Checklist antes de usar de verdade

- Configurar `.env`.
- Rodar migration e seed.
- Criar usuarios.
- Ajustar politicas se alguem precisar de acesso somente leitura.
- Conferir dados sensiveis de clientes.
- Preencher custos estimados dos produtos.
- Definir estoque minimo dos recursos.
- Testar nova venda, cancelamento e alteracao de status.
