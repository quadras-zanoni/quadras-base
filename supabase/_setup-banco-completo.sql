-- ============================================================
-- SETUP COMPLETO DO BANCO  —  Arena do Parque / banco compartilhado
-- Gerado em 2026-06-11. Cole TUDO de uma vez no SQL Editor do Supabase
-- (projeto cagkwoqyannbmputqxlz) e clique RUN. Rodar 1x, em banco novo vazio.
-- Ordem: 0001 (tabelas+seguranca) -> 0002 (venda atomica+travas) -> 0003 (blindagem publica).
-- ============================================================

-- >>>>>>>>>> PARTE 1/3 (0001_init) <<<<<<<<<<
-- ============================================================
-- Quadras CRM - Schema inicial
-- Cole este SQL no Supabase SQL Editor para criar as tabelas
-- ============================================================

-- Quadras
create table if not exists courts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null,
  price_per_hour numeric not null,
  duration integer not null,
  open_time text not null,
  close_time text not null,
  status text not null default 'ativa',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Agendamentos
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  court_id uuid references courts(id) not null,
  court_name text not null,
  client_id uuid,
  client_name text not null,
  client_phone text not null,
  notes text,
  date text not null,
  start_time text not null,
  end_time text not null,
  value numeric not null,
  status text not null default 'pendente',
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clientes
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text not null,
  notes text,
  last_booking_date text,
  total_bookings integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Produtos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null,
  quantity integer not null default 0,
  min_stock integer not null default 0,
  sale_price numeric not null,
  cost_price numeric not null,
  status text not null default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Movimentações de estoque
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) not null,
  product_name text not null,
  type text not null,
  quantity integer not null,
  reason text not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  created_at timestamptz default now()
);

-- Vendas (items armazenados como JSON)
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid,
  client_name text,
  items jsonb not null default '[]',
  total numeric not null,
  payment_method text not null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS) - cada dono vê só seus dados
-- ============================================================

alter table courts enable row level security;
alter table bookings enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table sales enable row level security;

-- Quadras: admin gerencia as próprias
create policy "owner_all_courts" on courts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Clientes: admin gerencia os próprios
create policy "owner_all_clients" on clients for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Produtos: admin gerencia os próprios
create policy "owner_all_products" on products for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Movimentações: admin gerencia as próprias
create policy "owner_all_stock" on stock_movements for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Vendas: admin gerencia as próprias
create policy "owner_all_sales" on sales for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Agendamentos: admin gerencia os próprios + público pode criar/ler (página de reservas)
create policy "owner_all_bookings" on bookings for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public_read_bookings" on bookings for select using (true);
create policy "public_insert_bookings" on bookings for insert with check (true);

-- Quadras: público pode ver as ativas (para página de reservas)
create policy "public_read_active_courts" on courts for select using (status = 'ativa');

-- >>>>>>>>>> PARTE 2/3 (0002_sales_rpc_and_guards) <<<<<<<<<<
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

-- >>>>>>>>>> PARTE 3/3 (0003_public_access_hardening) <<<<<<<<<<
-- ============================================================
-- Quadras CRM - 0003: blindagem do acesso público (multi-tenant)
-- ------------------------------------------------------------
-- Pré-requisito pro banco COMPARTILHADO entre arenas.
--
-- Problema corrigido: no 0001 o acesso anônimo (página pública de
-- reserva) era aberto demais —
--   public_read_bookings    using(true)        -> anon lia TODOS os
--       bookings (com client_name/client_phone) de TODAS as arenas;
--   public_insert_bookings  with check(true)   -> anon inseria booking
--       em qualquer arena via API crua;
--   public_read_active_courts using(status=..) -> anon listava quadras
--       de TODAS as arenas.
-- Num banco por cliente isso era quase inofensivo; num banco compartilhado
-- vira vazamento de dados entre clientes.
--
-- Correção: remover o acesso anon direto às tabelas e expor só o mínimo
-- via 3 funções SECURITY DEFINER, sempre filtradas por owner_id.
-- As policies owner_all_* (auth.uid() = owner_id) ficam INTACTAS:
-- o painel autenticado continua idêntico.
--
-- Idempotente.
-- ============================================================

-- 1) Remover as policies públicas inseguras --------------------------------
drop policy if exists "public_read_bookings"     on bookings;
drop policy if exists "public_insert_bookings"   on bookings;
drop policy if exists "public_read_active_courts" on courts;

-- 2) Quadras ativas de UMA arena (não expõe as outras) ---------------------
create or replace function public.get_public_courts(p_owner_id uuid)
returns setof courts
language sql
security definer
set search_path = public
stable
as $$
  select * from courts
  where owner_id = p_owner_id
    and status = 'ativa';
$$;

-- 3) Slots OCUPADOS de uma quadra/data — SEM dados de cliente --------------
--    Retorna só o necessário pra montar a grade de horários.
--    (cancelados não contam)
create or replace function public.get_booked_slots(
  p_owner_id uuid,
  p_court_id uuid,
  p_date     text
)
returns table (start_time text, end_time text)
language sql
security definer
set search_path = public
stable
as $$
  select start_time, end_time from bookings
  where owner_id = p_owner_id
    and court_id = p_court_id
    and date     = p_date
    and status  <> 'cancelado';
$$;

-- 4) Criar reserva(s) pública(s) — sempre 'pendente', all-or-nothing -------
--    p_slots: jsonb [{ "start_time": "08:00", "end_time": "09:00" }, ...]
--    Função plpgsql roda em 1 transação: se qualquer slot falhar (ex.: a
--    trava uq_booking_active_slot pegar reserva dupla em corrida), NADA é
--    gravado. Valida que a quadra é ativa e pertence à arena informada.
create or replace function public.create_public_bookings(
  p_owner_id     uuid,
  p_court_id     uuid,
  p_court_name   text,
  p_client_name  text,
  p_client_phone text,
  p_date         text,
  p_slots        jsonb,
  p_value        numeric
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot  jsonb;
  v_count integer := 0;
begin
  if not exists (
    select 1 from courts
    where id = p_court_id and owner_id = p_owner_id and status = 'ativa'
  ) then
    raise exception 'Quadra inválida para esta arena';
  end if;

  if jsonb_array_length(coalesce(p_slots, '[]'::jsonb)) = 0 then
    raise exception 'Nenhum horário informado';
  end if;

  for v_slot in select * from jsonb_array_elements(p_slots)
  loop
    insert into bookings (
      owner_id, court_id, court_name, client_name, client_phone,
      notes, date, start_time, end_time, value, status
    ) values (
      p_owner_id, p_court_id, p_court_name, p_client_name, p_client_phone,
      '', p_date, v_slot->>'start_time', v_slot->>'end_time', p_value, 'pendente'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 5) Permissões: somente estas 3 RPCs ficam acessíveis ao público (anon) ---
revoke all on function public.get_public_courts(uuid) from public;
grant  execute on function public.get_public_courts(uuid) to anon, authenticated;

revoke all on function public.get_booked_slots(uuid, uuid, text) from public;
grant  execute on function public.get_booked_slots(uuid, uuid, text) to anon, authenticated;

revoke all on function public.create_public_bookings(uuid, uuid, text, text, text, text, jsonb, numeric) from public;
grant  execute on function public.create_public_bookings(uuid, uuid, text, text, text, text, jsonb, numeric) to anon, authenticated;
