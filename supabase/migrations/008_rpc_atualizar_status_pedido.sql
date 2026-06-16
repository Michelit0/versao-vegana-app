create or replace function public.atualizar_status_pedido(
  p_id_pedido bigint,
  p_status public.status_pedido
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pedidos
     set status_pedido = p_status,
         atualizado_em = now()
   where id_pedido = p_id_pedido;

  return found;
end;
$$;

grant execute on function public.atualizar_status_pedido(bigint, public.status_pedido) to anon, authenticated;
