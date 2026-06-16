alter table public.pedidos
  add column if not exists tipo_entrega text not null default 'retirada',
  add column if not exists status_pagamento text not null default 'pago',
  add column if not exists motivo_cancelamento text,
  add column if not exists cancelado_em timestamptz;

alter table public.pedidos
  drop constraint if exists pedidos_tipo_entrega_check,
  add constraint pedidos_tipo_entrega_check
    check (tipo_entrega in ('retirada', 'entrega'));

alter table public.pedidos
  drop constraint if exists pedidos_status_pagamento_check,
  add constraint pedidos_status_pagamento_check
    check (status_pagamento in ('pago', 'pendente', 'pagar_na_retirada'));

create or replace function public.atualizar_status_pedido(
  p_id_pedido bigint,
  p_status public.status_pedido,
  p_motivo_cancelamento text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status = 'cancelado' and nullif(trim(coalesce(p_motivo_cancelamento, '')), '') is null then
    raise exception 'Informe o motivo do cancelamento.';
  end if;

  update public.pedidos
     set status_pedido = p_status,
         motivo_cancelamento = case
           when p_status = 'cancelado' then trim(p_motivo_cancelamento)
           else motivo_cancelamento
         end,
         cancelado_em = case
           when p_status = 'cancelado' then now()
           else cancelado_em
         end,
         atualizado_em = now()
   where id_pedido = p_id_pedido;

  return found;
end;
$$;

grant execute on function public.atualizar_status_pedido(bigint, public.status_pedido, text) to anon, authenticated;
