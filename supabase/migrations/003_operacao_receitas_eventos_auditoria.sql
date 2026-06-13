alter table public.produtos
  add column if not exists rendimento_pessoas numeric(12,3) not null default 20;

alter table public.receitas
  add column if not exists ordem_preparo integer,
  add column if not exists origem_hash text;

alter table public.itens_pedido
  add column if not exists origem_hash text;

alter table public.compras
  add column if not exists origem_hash text;

update public.receitas
set origem_hash = md5(concat_ws('|',
  coalesce(id_receita::text, ''),
  coalesce(id_produto::text, ''),
  coalesce(id_recurso::text, ''),
  coalesce(nome_recurso, ''),
  coalesce(qtd_ingrediente::text, ''),
  coalesce(tipo_medida, '')
))
where origem_hash is null;

update public.itens_pedido
set origem_hash = md5(concat_ws('|',
  coalesce(id_pedido::text, ''),
  coalesce(id_produto::text, ''),
  coalesce(nome_produto, ''),
  coalesce(quantidade::text, ''),
  coalesce(preco_unitario::text, ''),
  coalesce(preco_total::text, ''),
  coalesce(observacao, '')
))
where origem_hash is null;

update public.compras
set origem_hash = md5(concat_ws('|',
  coalesce(id_compra::text, ''),
  coalesce(id_recurso::text, ''),
  coalesce(nome_recurso, ''),
  coalesce(id_fornecedor::text, ''),
  coalesce(qtd_comprada::text, ''),
  coalesce(data_compra::text, ''),
  coalesce(custo_total::text, ''),
  coalesce(tipo_medida, '')
))
where origem_hash is null;

create unique index if not exists idx_pedidos_id_pedido_unico
  on public.pedidos (id_pedido)
  where id_pedido is not null;

create unique index if not exists idx_receitas_origem_hash_unico
  on public.receitas (origem_hash)
  where origem_hash is not null;

create unique index if not exists idx_itens_pedido_origem_hash_unico
  on public.itens_pedido (origem_hash)
  where origem_hash is not null;

create unique index if not exists idx_compras_origem_hash_unico
  on public.compras (origem_hash)
  where origem_hash is not null;

create or replace function public.registrar_auditoria_alteracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  id_entidade_text text;
  dados_novos jsonb;
begin
  dados_novos := to_jsonb(new);
  id_entidade_text := coalesce(
    dados_novos ->> 'id_produto',
    dados_novos ->> 'id_receita_item',
    dados_novos ->> 'id_cliente',
    dados_novos ->> 'id_fornecedor',
    dados_novos ->> 'id_recurso',
    dados_novos ->> 'id_pedido',
    dados_novos ->> 'id_forma_pagamento',
    dados_novos ->> 'cod_categoria',
    dados_novos ->> 'tipo_medida'
  );

  if to_jsonb(old) is distinct from dados_novos then
    insert into public.auditoria (id_usuario, acao, nome_entidade, id_entidade, dados_antes, dados_depois)
    values (auth.uid(), 'update', tg_table_name, id_entidade_text, to_jsonb(old), dados_novos);
  end if;

  return new;
end;
$$;

drop trigger if exists audita_produtos_update on public.produtos;
create trigger audita_produtos_update after update on public.produtos
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists audita_receitas_update on public.receitas;
create trigger audita_receitas_update after update on public.receitas
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists audita_clientes_update on public.clientes;
create trigger audita_clientes_update after update on public.clientes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists audita_fornecedores_update on public.fornecedores;
create trigger audita_fornecedores_update after update on public.fornecedores
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists audita_recursos_update on public.recursos;
create trigger audita_recursos_update after update on public.recursos
for each row execute function public.registrar_auditoria_alteracao();

drop policy if exists "app_atualiza_receitas" on public.receitas;
create policy "app_atualiza_receitas" on public.receitas for update to anon, authenticated using (true) with check (true);

drop policy if exists "app_remove_receitas" on public.receitas;
create policy "app_remove_receitas" on public.receitas for delete to anon, authenticated using (true);

drop policy if exists "app_atualiza_clientes" on public.clientes;
create policy "app_atualiza_clientes" on public.clientes for update to anon, authenticated using (true) with check (true);

drop policy if exists "app_atualiza_fornecedores" on public.fornecedores;
create policy "app_atualiza_fornecedores" on public.fornecedores for update to anon, authenticated using (true) with check (true);

drop policy if exists "app_atualiza_formas_pagamento" on public.formas_pagamento;
create policy "app_atualiza_formas_pagamento" on public.formas_pagamento for update to anon, authenticated using (true) with check (true);
