-- Visao analitica para cotacao de recursos por fornecedor.
-- Grao: 1 linha por recurso + fornecedor.
-- Mantem o cadastro limpo: nao duplica recursos quando o preco muda.

create or replace view public.vw_cotacao_recursos_fornecedores as
with compras_validas as (
  select
    id_recurso,
    nome_recurso,
    id_fornecedor,
    nome_fornecedor,
    qtd_comprada,
    custo_total,
    tipo_medida,
    data_compra,
    custo_total / nullif(qtd_comprada, 0) as custo_unitario
  from public.compras
  where id_recurso is not null
    and id_fornecedor is not null
    and qtd_comprada > 0
    and custo_total > 0
),
ultimas_compras as (
  select
    *,
    row_number() over (
      partition by id_recurso, id_fornecedor
      order by data_compra desc nulls last
    ) as rn
  from compras_validas
),
metricas as (
  select
    id_recurso,
    id_fornecedor,
    avg(custo_unitario) as custo_unitario_medio,
    min(custo_unitario) as custo_unitario_minimo,
    max(custo_unitario) as custo_unitario_maximo,
    count(*) as qtd_compras
  from compras_validas
  group by id_recurso, id_fornecedor
)
select
  u.id_recurso,
  u.nome_recurso,
  u.id_fornecedor,
  u.nome_fornecedor,
  u.data_compra as data_ultima_compra,
  u.custo_unitario as ultimo_custo_unitario,
  m.custo_unitario_medio,
  m.custo_unitario_minimo,
  m.custo_unitario_maximo,
  m.qtd_compras,
  u.qtd_comprada as ultima_qtd_comprada,
  u.tipo_medida as ultima_tipo_medida
from ultimas_compras u
join metricas m
  on m.id_recurso = u.id_recurso
 and m.id_fornecedor = u.id_fornecedor
where u.rn = 1;

grant select on public.vw_cotacao_recursos_fornecedores to anon, authenticated;

