alter table public.produtos
  add column if not exists descricao text,
  add column if not exists destaque_autoatendimento boolean not null default false;

create index if not exists idx_produtos_autoatendimento
  on public.produtos (destaque_autoatendimento, disponibilidade);
