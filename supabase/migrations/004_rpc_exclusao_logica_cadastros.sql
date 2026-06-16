-- Exclusao logica controlada para cadastros.
-- Padrao de producao:
-- - o app publico nao recebe UPDATE amplo nas tabelas;
-- - cada operacao passa por uma funcao security definer;
-- - registros com historico ficam preservados com ativo = false.

create or replace function public.inativar_cliente(p_id_cliente integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update public.clientes
     set ativo = false,
         atualizado_em = now()
   where id_cliente = p_id_cliente
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

create or replace function public.inativar_fornecedor(p_id_fornecedor integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update public.fornecedores
     set ativo = false,
         atualizado_em = now()
   where id_fornecedor = p_id_fornecedor
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

create or replace function public.inativar_recurso(p_id_recurso integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update public.recursos
     set ativo = false,
         atualizado_em = now()
   where id_recurso = p_id_recurso
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

create or replace function public.inativar_produto(p_id_produto integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update public.produtos
     set ativo = false,
         disponibilidade = 'Nao',
         atualizado_em = now()
   where id_produto = p_id_produto
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

-- Receitas ainda nao possuem coluna ativo. A rotina abaixo remove apenas o item
-- especifico da receita e evita expor DELETE amplo da tabela para o app.
create or replace function public.excluir_item_receita(p_id_receita_item integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted boolean;
begin
  delete from public.receitas
   where id_receita_item = p_id_receita_item
  returning true into v_deleted;

  return coalesce(v_deleted, false);
end;
$$;

revoke all on function public.inativar_cliente(integer) from public;
revoke all on function public.inativar_fornecedor(integer) from public;
revoke all on function public.inativar_recurso(integer) from public;
revoke all on function public.inativar_produto(integer) from public;
revoke all on function public.excluir_item_receita(integer) from public;

grant execute on function public.inativar_cliente(integer) to anon, authenticated;
grant execute on function public.inativar_fornecedor(integer) to anon, authenticated;
grant execute on function public.inativar_recurso(integer) to anon, authenticated;
grant execute on function public.inativar_produto(integer) to anon, authenticated;
grant execute on function public.excluir_item_receita(integer) to anon, authenticated;

