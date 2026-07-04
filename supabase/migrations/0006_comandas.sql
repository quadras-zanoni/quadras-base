-- ============================================================
-- Quadras CRM - 0006: COMANDAS (venda em aberto)
-- ------------------------------------------------------------
-- Comanda = uma venda com status 'aberta'. Reusa a tabela sales.
-- Vai lançando o horário + produtos consumidos; cada produto
-- lançado baixa o estoque em tempo real (RPC), remover devolve.
-- Ao fechar, vira uma venda normal (status 'fechada').
--
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Colunas novas em sales (vendas existentes viram 'fechada')
-- ------------------------------------------------------------
alter table sales add column if not exists status text not null default 'fechada';
alter table sales add column if not exists booking_id uuid;
alter table sales add column if not exists opened_at timestamptz;
alter table sales add column if not exists closed_at timestamptz;

-- Comanda aberta ainda não tem forma de pagamento definida.
alter table sales alter column payment_method drop not null;

-- Restringe os valores possíveis de status (bloco idempotente).
do $$
begin
  alter table sales add constraint sales_status_check
    check (status in ('aberta', 'fechada', 'cancelada'));
exception
  when duplicate_object then null;
end $$;

-- Índice para listar rápido as comandas abertas do dono.
create index if not exists idx_sales_owner_status on sales (owner_id, status);

-- ------------------------------------------------------------
-- 2) RPC comanda_add_item: lança 1 produto na comanda e baixa
--    o estoque de forma ATÔMICA (espelha register_sale).
--    Se já existe a linha do produto no jsonb, INCREMENTA a
--    quantidade; senão faz APPEND. security invoker → respeita RLS.
-- ------------------------------------------------------------
create or replace function comanda_add_item(
  p_comanda_id uuid,
  p_product_id uuid,
  p_qty int
) returns void
language plpgsql
security invoker
as $$
declare
  v_owner uuid := auth.uid();
  v_items jsonb;
  v_prod products%rowtype;
  v_new_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_total numeric := 0;
  v_found boolean := false;
  v_new_qty int;
begin
  if v_owner is null then
    raise exception 'Usuário não autenticado';
  end if;

  -- Comanda precisa existir, ser minha e estar aberta.
  select items into v_items from sales
    where id = p_comanda_id and owner_id = v_owner and status = 'aberta';
  if not found then
    raise exception 'Comanda não encontrada ou já fechada';
  end if;

  -- Produto precisa existir, ser meu e ter estoque suficiente.
  select * into v_prod from products
    where id = p_product_id and owner_id = v_owner;
  if not found then
    raise exception 'Produto não encontrado';
  end if;
  if v_prod.quantity < p_qty then
    raise exception 'Estoque insuficiente para %. Disponível: %', v_prod.name, v_prod.quantity;
  end if;

  -- Reconstrói o array: se achar a linha do produto, soma a quantidade
  -- e recalcula o total (quantity * unitPrice, mantendo o preço congelado).
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    if (v_item->>'productId') = p_product_id::text then
      v_found := true;
      v_new_qty := (v_item->>'quantity')::int + p_qty;
      v_item := jsonb_set(v_item, '{quantity}', to_jsonb(v_new_qty));
      v_item := jsonb_set(v_item, '{total}', to_jsonb(v_new_qty * (v_item->>'unitPrice')::numeric));
    end if;
    v_new_items := v_new_items || v_item;
  end loop;

  -- Produto ainda não estava na comanda → append (formato SaleItem).
  if not v_found then
    v_new_items := v_new_items || jsonb_build_object(
      'productId',   p_product_id,
      'productName', v_prod.name,
      'quantity',    p_qty,
      'unitPrice',   v_prod.sale_price,
      'total',       p_qty * v_prod.sale_price
    );
  end if;

  -- Total da comanda = soma de todos os item.total.
  select coalesce(sum((e->>'total')::numeric), 0) into v_total
    from jsonb_array_elements(v_new_items) e;

  update sales set items = v_new_items, total = v_total, updated_at = now()
    where id = p_comanda_id;

  -- Baixa o estoque + registra a movimentação (idêntico ao register_sale).
  update products set quantity = quantity - p_qty, updated_at = now()
    where id = v_prod.id;
  insert into stock_movements
    (owner_id, product_id, product_name, type, quantity, reason, previous_quantity, new_quantity)
  values
    (v_owner, v_prod.id, v_prod.name, 'saida', p_qty, 'Comanda',
     v_prod.quantity, v_prod.quantity - p_qty);
end;
$$;

-- ------------------------------------------------------------
-- 3) RPC comanda_remove_item: tira 1 produto da comanda e
--    DEVOLVE todo o estoque daquela linha, de forma atômica.
--    Se a linha não existe, retorna sem erro.
-- ------------------------------------------------------------
create or replace function comanda_remove_item(
  p_comanda_id uuid,
  p_product_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  v_owner uuid := auth.uid();
  v_items jsonb;
  v_prod products%rowtype;
  v_new_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_total numeric := 0;
  v_qty int := 0;
  v_found boolean := false;
begin
  if v_owner is null then
    raise exception 'Usuário não autenticado';
  end if;

  -- Comanda precisa existir, ser minha e estar aberta.
  select items into v_items from sales
    where id = p_comanda_id and owner_id = v_owner and status = 'aberta';
  if not found then
    raise exception 'Comanda não encontrada ou já fechada';
  end if;

  -- Reconstrói o array sem a linha do produto; guarda a quantidade removida.
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    if (v_item->>'productId') = p_product_id::text then
      v_found := true;
      v_qty := (v_item->>'quantity')::int;
    else
      v_new_items := v_new_items || v_item;
    end if;
  end loop;

  -- Linha não existe na comanda → nada a fazer.
  if not v_found then
    return;
  end if;

  -- Recalcula o total da comanda sem a linha removida.
  select coalesce(sum((e->>'total')::numeric), 0) into v_total
    from jsonb_array_elements(v_new_items) e;

  update sales set items = v_new_items, total = v_total, updated_at = now()
    where id = p_comanda_id;

  -- Devolve o estoque + registra a movimentação de entrada.
  -- Guarda-se contra produto apagado (FK de stock_movements exige produto existente).
  select * into v_prod from products
    where id = p_product_id and owner_id = v_owner;
  if found then
    update products set quantity = quantity + v_qty, updated_at = now()
      where id = v_prod.id;
    insert into stock_movements
      (owner_id, product_id, product_name, type, quantity, reason, previous_quantity, new_quantity)
    values
      (v_owner, v_prod.id, v_prod.name, 'entrada', v_qty, 'Comanda cancelada/estorno',
       v_prod.quantity, v_prod.quantity + v_qty);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 4) Grants: comanda é só painel autenticado (NÃO conceder a anon).
-- ------------------------------------------------------------
grant execute on function comanda_add_item(uuid, uuid, int) to authenticated;
grant execute on function comanda_remove_item(uuid, uuid) to authenticated;
