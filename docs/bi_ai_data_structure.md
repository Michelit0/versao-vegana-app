# Evolucao da estrutura para BI e IA

Objetivo: manter o principal da planilha, mas enriquecer a base para gerar dashboards, previsoes, alertas e insights confiaveis.

## O que manter

A estrutura atual ja tem uma boa espinha dorsal:

- produtos
- clientes
- pedidos
- itens do pedido
- formas de pagamento
- regioes
- recursos/ingredientes
- receitas
- compras
- fornecedores
- producao

Isso deve continuar existindo. A mudanca principal e sair de abas soltas para tabelas com chaves, historico e campos analiticos.

## Campos novos recomendados

### Pedidos

Adicionar:

- `sales_channel`: whatsapp, instagram, ifood, balcao, indicacao, outro
- `fulfillment_status`: nao iniciado, em producao, pronto, entregue, retirado, cancelado
- `delivery_due_at`: prazo combinado
- `delivered_at`: entrega real
- `discount`: desconto explicito
- `estimated_cost`: custo estimado do pedido
- `contribution_margin`: margem calculada
- `created_by`: quem lancou
- `notes`: observacoes operacionais

Valor para BI/IA:

- margem por canal
- atraso de entrega
- recorrencia por origem
- previsao de demanda por dia/canal
- analise de desconto e rentabilidade

### Itens do pedido

Adicionar:

- `unit_cost_estimate`
- `note`

Valor para BI/IA:

- margem por produto
- produtos vendidos juntos
- impacto de observacoes/restricoes na operacao

### Clientes

Adicionar:

- `acquisition_channel`
- `first_order_at`
- `last_order_at`
- `lgpd_consent`
- `delivery_notes`
- `active`

Valor para BI/IA:

- RFM: recencia, frequencia e valor
- clientes em risco de churn
- perfil de consumo por restricao alimentar
- campanhas para clientes recorrentes

### Produtos

Adicionar:

- `cost_estimate`
- `target_margin_pct`
- `prep_time_minutes`
- `shelf_life_days`
- `tags`
- `image_url`

Valor para BI/IA:

- margem por produto
- engenharia de cardapio
- sugestao de precificacao
- recomendacao de producao por validade

### Recursos e estoque

Adicionar:

- `minimum_stock`
- `reorder_quantity`
- `preferred_supplier_id`
- `inventory_movements`

Valor para BI/IA:

- alerta de estoque baixo
- sugestao de compra
- rastreio de consumo por receita
- previsao de ruptura

### Compras

Adicionar:

- `invoice_number`
- `unit_cost` derivado
- fornecedor preferencial no recurso

Valor para BI/IA:

- inflacao de insumos
- melhor fornecedor por preco
- variacao de custo e impacto na margem

## Views analiticas criadas

O schema ja inclui:

- `vw_sales_daily`: vendas, receita, margem e ticket medio por dia
- `vw_product_performance`: quantidade vendida, receita e margem por produto
- `vw_customer_rfm`: recencia, frequencia e valor por cliente
- `vw_data_quality_issues`: problemas de dados acionaveis

## Regras de qualidade de dados

Regras iniciais:

- cliente sem telefone e sem email
- produto sem custo estimado
- pedido com valor final negativo
- recurso abaixo do estoque minimo

Proximas regras boas:

- pedido finalizado sem item
- item com preco unitario diferente do cadastro sem desconto informado
- cliente duplicado por telefone
- produto disponivel sem preco
- compra sem fornecedor
- recurso vencido com estoque positivo

## Perguntas que a base passa a responder

- Quais produtos vendem mais e quais dao mais margem?
- Quais clientes estao comprando menos que antes?
- Qual canal traz mais receita liquida?
- Que ingredientes preciso comprar para a demanda prevista?
- Qual fornecedor esta encarecendo mais os insumos?
- Quais pedidos atrasaram e onde o processo travou?
- Que produtos combinam melhor no mesmo pedido?

## Recomendacao pratica

No app, os campos extras devem aparecer aos poucos. Para as meninas, manter a tela simples:

- cliente
- itens
- pagamento
- entrega
- observacao

Para administracao e BI, guardar mais informacoes nos bastidores:

- canal
- responsavel
- custo
- margem
- status operacional
- timestamps
- qualidade de cadastro
