-- 0007: apagar venda (com devolução de estoque).
-- Pra corrigir venda lançada errada. Devolve o estoque dos produtos e apaga a venda.
-- Espelha o padrão da comanda: security invoker, respeita RLS por owner.
create or replace function delete_sale(p_sale_id uuid) returns void
language plpgsql
security invoker
as $$
declare
  v_owner uuid := auth.uid();
  v_items jsonb;
  v_item jsonb;
  v_prod products%rowtype;
  v_qty int;
begin
  if v_owner is null then
    raise exception 'Usuário não autenticado';
  end if;

  select items into v_items from sales where id = p_sale_id and owner_id = v_owner;
  if not found then
    raise exception 'Venda não encontrada';
  end if;

  -- Devolve o estoque de cada produto (pula a linha de horário, productId '').
  for v_item in select * from jsonb_array_elements(coalesce(v_items, '[]'::jsonb))
  loop
    if coalesce(v_item->>'productId', '') <> '' then
      v_qty := (v_item->>'quantity')::int;
      select * into v_prod from products where id = (v_item->>'productId')::uuid and owner_id = v_owner;
      if found then
        update products set quantity = quantity + v_qty, updated_at = now() where id = v_prod.id;
        insert into stock_movements
          (owner_id, product_id, product_name, type, quantity, reason, previous_quantity, new_quantity)
        values
          (v_owner, v_prod.id, v_prod.name, 'entrada', v_qty, 'Venda apagada',
           v_prod.quantity, v_prod.quantity + v_qty);
      end if;
    end if;
  end loop;

  delete from sales where id = p_sale_id;
end;
$$;

grant execute on function delete_sale(uuid) to authenticated;
