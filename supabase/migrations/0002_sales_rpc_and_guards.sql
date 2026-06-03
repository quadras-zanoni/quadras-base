-- ============================================================
-- Quadras CRM - 0002: venda transacional + travas de integridade
-- ============================================================

-- Garante as colunas de cliente em bancos já existentes (idempotente)
alter table sales add column if not exists client_id uuid;
alter table sales add column if not exists client_name text;

-- ------------------------------------------------------------
-- Trava de reserva dupla: dois agendamentos ATIVOS não podem
-- ocupar o mesmo horário inicial na mesma quadra/data.
-- (cancelados não contam)
-- ------------------------------------------------------------
create unique index if not exists uq_booking_active_slot
  on bookings (court_id, date, start_time)
  where status <> 'cancelado';

-- ------------------------------------------------------------
-- Venda transacional: valida estoque e grava venda + baixa de
-- estoque + movimentações de forma ATÔMICA. Se qualquer passo
-- falhar (ex: estoque insuficiente), nada é gravado.
-- Roda como o próprio usuário (security invoker) → respeita RLS.
-- ------------------------------------------------------------
create or replace function register_sale(
  p_items jsonb,
  p_payment_method text,
  p_notes text default '',
  p_client_id uuid default null,
  p_client_name text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_owner uuid := auth.uid();
  v_total numeric := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_qty integer;
  v_sale_id uuid;
begin
  if v_owner is null then
    raise exception 'Usuário não autenticado';
  end if;

  -- 1) Validar estoque e somar total
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product from products
      where id = (v_item->>'productId')::uuid and owner_id = v_owner;
    if not found then
      raise exception 'Produto não encontrado: %', coalesce(v_item->>'productName', '?');
    end if;
    if v_product.quantity < v_qty then
      raise exception 'Estoque insuficiente para %. Disponível: %', v_product.name, v_product.quantity;
    end if;
    v_total := v_total + (v_item->>'total')::numeric;
  end loop;

  -- 2) Inserir venda
  insert into sales (owner_id, client_id, client_name, items, total, payment_method, notes)
  values (v_owner, p_client_id, p_client_name, p_items, v_total, p_payment_method, coalesce(p_notes, ''))
  returning id into v_sale_id;

  -- 3) Baixar estoque + registrar movimentação
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product from products
      where id = (v_item->>'productId')::uuid and owner_id = v_owner;
    update products set quantity = quantity - v_qty, updated_at = now()
      where id = v_product.id;
    insert into stock_movements
      (owner_id, product_id, product_name, type, quantity, reason, previous_quantity, new_quantity)
    values
      (v_owner, v_product.id, v_product.name, 'saida', v_qty, 'Venda registrada',
       v_product.quantity, v_product.quantity - v_qty);
  end loop;

  return v_sale_id;
end;
$$;

grant execute on function register_sale(jsonb, text, text, uuid, text) to authenticated, anon;
