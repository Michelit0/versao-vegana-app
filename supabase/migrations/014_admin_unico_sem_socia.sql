update public.usuarios_permitidos
   set perfil = 'operacao',
       atualizado_em = now()
 where perfil = 'socia';

update public.perfis
   set perfil = 'operacao',
       atualizado_em = now()
 where perfil = 'socia';

insert into public.usuarios_permitidos (email, nome_completo, perfil, ativo)
values ('restauranteversao.vegana@gmail.com', 'Administrador Versao Vegana', 'admin', true)
on conflict (email) do update
set nome_completo = excluded.nome_completo,
    perfil = 'admin',
    ativo = true,
    atualizado_em = now();

update public.perfis p
   set perfil = 'admin',
       ativo = true,
       atualizado_em = now()
  from auth.users u
 where p.id_usuario = u.id
   and lower(u.email) = 'restauranteversao.vegana@gmail.com';

create or replace function public.usuario_elevado()
returns boolean
language sql
stable
as $$
  select coalesce(public.perfil_atual() = 'admin', false)
$$;

create or replace function public.validar_usuario_permitido_admin_unico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));

  if new.perfil = 'socia' then
    raise exception 'Perfil socia nao e mais utilizado. Use operacao, cozinha, consulta ou autoatendimento.';
  end if;

  if new.perfil = 'admin' and new.email <> 'restauranteversao.vegana@gmail.com' then
    raise exception 'O unico email administrador permitido e restauranteversao.vegana@gmail.com.';
  end if;

  if new.email = 'restauranteversao.vegana@gmail.com' then
    new.perfil := 'admin';
    new.ativo := true;
  end if;

  return new;
end;
$$;

drop trigger if exists validar_usuario_permitido_admin_unico on public.usuarios_permitidos;
create trigger validar_usuario_permitido_admin_unico
before insert or update on public.usuarios_permitidos
for each row execute function public.validar_usuario_permitido_admin_unico();

alter table public.usuarios_permitidos
  drop constraint if exists usuarios_permitidos_sem_socia;

alter table public.usuarios_permitidos
  add constraint usuarios_permitidos_sem_socia check (perfil <> 'socia');

alter table public.perfis
  drop constraint if exists perfis_sem_socia;

alter table public.perfis
  add constraint perfis_sem_socia check (perfil <> 'socia');
