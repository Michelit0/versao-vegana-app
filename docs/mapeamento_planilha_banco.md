# Mapeamento da planilha para o banco

Todas as tabelas e colunas do banco foram nomeadas em portugues, com letras minusculas e sem acentuacao.

| Aba da planilha | Tabela no Supabase |
|---|---|
| Produtos | `produtos` |
| Recursos | `recursos` |
| Receitas | `receitas` |
| Producao | `producoes` |
| Pedidos | `pedidos` |
| Itens Pedido | `itens_pedido` |
| Compras | `compras` |
| Fornecedores | `fornecedores` |
| Forma Pagamento | `formas_pagamento` |
| Clientes | `clientes` |
| Regioes | `regioes` |
| Funcionarios | `funcionarios` |
| Tipo Medida | `tipos_medida` |
| Categorias | `categorias` |

## Colunas originais contempladas

- `Produtos`: `id_produto`, `nome_produto`, `categoria`, `desc_categoria`, `preco`, `disponibilidade`, `peso`, `tipo_medida`, `data_inclusao`, `id_recurso`
- `Recursos`: `id_recurso`, `tipo_recurso`, `nome_recurso`, `id_categoria_recurso`, `desc_categoria_rec`, `qtd_estoque`, `custo_unitario`, `tipo_medida`, `data_validade`, `data_inclusao`, `att_estoque_pedido`
- `Receitas`: `id_receita`, `id_produto`, `nome_produto`, `id_recurso`, `nome_recurso`, `qtd_ingrediente`, `tipo_medida`
- `Producoes`: `id_producao`, `id_produto`, `nome_produto`, `qtd_produzida`, `data_producao`, `data_validade`
- `Pedidos`: `id_pedido`, `data_pedido`, `id_cliente`, `nome_cliente`, `valor_total`, `status_pedido`, `id_forma_pagamento`, `forma_pagamento`, `taxa_cartao`, `taxa_entrega`, `taxa_embalagem`, `taxa_ifood`, `valor_final`
- `Itens Pedido`: `id_pedido`, `id_produto`, `nome_produto`, `quantidade`, `preco_unitario`, `preco_total`, `observacao`
- `Compras`: `id_compra`, `id_recurso`, `nome_recurso`, `id_fornecedor`, `nome_fornecedor`, `qtd_comprada`, `data_compra`, `custo_total`, `tipo_medida`
- `Fornecedores`: `id_fornecedor`, `nome_fornecedor`, `telefone_fornecedor`, `email_fornecedor`, `observacao`, `data_inclusao`
- `Formas Pagamento`: `id_forma_pagamento`, `forma_pagamento`, `bandeira`, `prazo_recebimento`, `taxa`
- `Clientes`: `id_cliente`, `nome_cliente`, `email_cliente`, `telefone_cliente`, `endereco_cliente`, `id_regiao`, `regiao`, `data_nascimento`, `preferencias_alimentares`, `data_inclusao`, `entrega`
- `Regioes`: `id_regiao`, `regiao`, `taxa`
- `Funcionarios`: `id_funcionario`, `nome_funcionario`, `cargo`, `data_admissao`, `salario`, `cpf`, `data_nascimento`, `telefone`, `email`, `endereco`, `numero_carteira_trabalho`, `status`, `observacoes`
- `Tipos Medida`: `tipo_medida`
- `Categorias`: `cod_categoria`, `categoria`

## Campos extras para BI e IA

Foram adicionados campos operacionais e analiticos sem remover os campos originais:

- `canal_venda`, `status_atendimento`, `prazo_entrega_em`, `entregue_em`
- `desconto`, `custo_estimado`, `margem_contribuicao`
- `estoque_minimo`, `qtd_reposicao`, `id_fornecedor_preferencial`
- `canal_aquisicao`, `primeira_compra_em`, `ultima_compra_em`, `consentimento_lgpd`
- views `vw_vendas_diarias`, `vw_desempenho_produtos`, `vw_clientes_rfv`, `vw_issues_qualidade_dados`
