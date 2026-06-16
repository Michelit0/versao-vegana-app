revoke execute on function public.inativar_cliente(integer) from anon;
revoke execute on function public.inativar_fornecedor(integer) from anon;
revoke execute on function public.inativar_recurso(integer) from anon;
revoke execute on function public.inativar_produto(integer) from anon;
revoke execute on function public.excluir_item_receita(integer) from anon;

grant execute on function public.inativar_cliente(integer) to authenticated;
grant execute on function public.inativar_fornecedor(integer) to authenticated;
grant execute on function public.inativar_recurso(integer) to authenticated;
grant execute on function public.inativar_produto(integer) to authenticated;
grant execute on function public.excluir_item_receita(integer) to authenticated;
