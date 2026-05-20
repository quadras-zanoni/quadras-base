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
