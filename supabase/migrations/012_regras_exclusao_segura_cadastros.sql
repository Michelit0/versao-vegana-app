alter table public.receitas
  add column if not exists ativo boolean not null default true;

create or replace function public.permitir_manutencao_cadastro()
returns public.perfil_usuario
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_perfil public.perfil_usuario;
begin
  v_perfil := public.perfil_atual();

  if v_perfil not in ('admin', 'socia', 'operacao') then
    raise exception 'Perfil sem permissao para alterar cadastros.';
  end if;

  return v_perfil;
end;
$$;

create or replace function public.registrar_auditoria_manual(
  p_acao text,
  p_nome_entidade text,
  p_id_entidade text,
  p_dados_antes jsonb,
  p_dados_depois jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auditoria (id_usuario, acao, nome_entidade, id_entidade, dados_antes, dados_depois)
  values (auth.uid(), p_acao, p_nome_entidade, p_id_entidade, p_dados_antes, p_dados_depois);
end;
$$;

create or replace function public.inativar_cliente(p_id_cliente integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfil_usuario;
  v_cliente public.clientes%rowtype;
  v_usado boolean;
begin
  v_perfil := public.permitir_manutencao_cadastro();

  select * into v_cliente from public.clientes where id_cliente = p_id_cliente;
  if not found then
    return false;
  end if;

  select exists (
    select 1 from public.pedidos where id_cliente = p_id_cliente
  ) into v_usado;

  if not v_usado and v_perfil in ('admin', 'socia') then
    delete from public.clientes where id_cliente = p_id_cliente;
    perform public.registrar_auditoria_manual('delete', 'clientes', p_id_cliente::text, to_jsonb(v_cliente), null);
    return true;
  end if;

  update public.clientes
     set ativo = false,
         atualizado_em = now()
   where id_cliente = p_id_cliente;

  return true;
end;
$$;

create or replace function public.inativar_fornecedor(p_id_fornecedor integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfil_usuario;
  v_fornecedor public.fornecedores%rowtype;
  v_usado boolean;
begin
  v_perfil := public.permitir_manutencao_cadastro();

  select * into v_fornecedor from public.fornecedores where id_fornecedor = p_id_fornecedor;
  if not found then
    return false;
  end if;

  select exists (
    select 1 from public.compras where id_fornecedor = p_id_fornecedor
    union all
    select 1 from public.recursos where id_fornecedor_preferencial = p_id_fornecedor
  ) into v_usado;

  if not v_usado and v_perfil in ('admin', 'socia') then
    delete from public.fornecedores where id_fornecedor = p_id_fornecedor;
    perform public.registrar_auditoria_manual('delete', 'fornecedores', p_id_fornecedor::text, to_jsonb(v_fornecedor), null);
    return true;
  end if;

  update public.fornecedores
     set ativo = false,
         atualizado_em = now()
   where id_fornecedor = p_id_fornecedor;

  return true;
end;
$$;

create or replace function public.inativar_recurso(p_id_recurso integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfil_usuario;
  v_recurso public.recursos%rowtype;
  v_usado boolean;
begin
  v_perfil := public.permitir_manutencao_cadastro();

  select * into v_recurso from public.recursos where id_recurso = p_id_recurso;
  if not found then
    return false;
  end if;

  select exists (
    select 1 from public.compras where id_recurso = p_id_recurso
    union all
    select 1 from public.receitas where id_recurso = p_id_recurso
    union all
    select 1 from public.movimentacoes_estoque where id_recurso = p_id_recurso
    union all
    select 1 from public.produtos where id_recurso = p_id_recurso
  ) into v_usado;

  if not v_usado and v_perfil in ('admin', 'socia') then
    delete from public.recursos where id_recurso = p_id_recurso;
    perform public.registrar_auditoria_manual('delete', 'recursos', p_id_recurso::text, to_jsonb(v_recurso), null);
    return true;
  end if;

  update public.recursos
     set ativo = false,
         atualizado_em = now()
   where id_recurso = p_id_recurso;

  return true;
end;
$$;

create or replace function public.inativar_produto(p_id_produto integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfil_usuario;
  v_produto public.produtos%rowtype;
  v_usado boolean;
begin
  v_perfil := public.permitir_manutencao_cadastro();

  select * into v_produto from public.produtos where id_produto = p_id_produto;
  if not found then
    return false;
  end if;

  select exists (
    select 1 from public.itens_pedido where id_produto = p_id_produto
    union all
    select 1 from public.receitas where id_produto = p_id_produto
    union all
    select 1 from public.producoes where id_produto = p_id_produto
  ) into v_usado;

  if not v_usado and v_perfil in ('admin', 'socia') then
    delete from public.produtos where id_produto = p_id_produto;
    perform public.registrar_auditoria_manual('delete', 'produtos', p_id_produto::text, to_jsonb(v_produto), null);
    return true;
  end if;

  update public.produtos
     set ativo = false,
         disponibilidade = 'Nao',
         atualizado_em = now()
   where id_produto = p_id_produto;

  return true;
end;
$$;

create or replace function public.excluir_item_receita(p_id_receita_item integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receita public.receitas%rowtype;
begin
  perform public.permitir_manutencao_cadastro();

  select * into v_receita from public.receitas where id_receita_item = p_id_receita_item;
  if not found then
    return false;
  end if;

  update public.receitas
     set ativo = false
   where id_receita_item = p_id_receita_item;

  return true;
end;
$$;

revoke all on function public.permitir_manutencao_cadastro() from public;
revoke all on function public.registrar_auditoria_manual(text, text, text, jsonb, jsonb) from public;
revoke all on function public.inativar_cliente(integer) from public;
revoke all on function public.inativar_fornecedor(integer) from public;
revoke all on function public.inativar_recurso(integer) from public;
revoke all on function public.inativar_produto(integer) from public;
revoke all on function public.excluir_item_receita(integer) from public;

grant execute on function public.inativar_cliente(integer) to authenticated;
grant execute on function public.inativar_fornecedor(integer) to authenticated;
grant execute on function public.inativar_recurso(integer) to authenticated;
grant execute on function public.inativar_produto(integer) to authenticated;
grant execute on function public.excluir_item_receita(integer) to authenticated;
