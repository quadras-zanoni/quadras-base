-- Tenants (one row per arena client)
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome_exibicao text not null,
  logo_url text,
  cor_primaria text not null default '#0a0a0a',
  whatsapp_avisos text,
  token_link_publico uuid not null default gen_random_uuid(),
  status_assinatura text not null default 'ativo' check (status_assinatura in ('ativo', 'bloqueado')),
  criado_em timestamptz not null default now()
);
create unique index tenants_token_link_publico_idx on tenants (token_link_publico);

create table quadras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  tipo_esporte text not null,
  preco_hora_centavos integer not null check (preco_hora_centavos >= 0),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
create index quadras_tenant_id_idx on quadras (tenant_id);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  telefone text not null,
  criado_em timestamptz not null default now()
);
create index clientes_tenant_id_idx on clientes (tenant_id);
create index clientes_tenant_telefone_idx on clientes (tenant_id, telefone);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  quadra_id uuid not null references quadras (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null check (hora_fim > hora_inicio),
  status text not null default 'confirmado' check (status in ('confirmado', 'cancelado')),
  origem text not null default 'admin' check (origem in ('admin', 'link_publico')),
  recorrente boolean not null default false,
  criado_em timestamptz not null default now()
);
create index agendamentos_tenant_data_idx on agendamentos (tenant_id, data);
create index agendamentos_quadra_data_idx on agendamentos (quadra_id, data);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  categoria text not null default 'geral',
  preco_centavos integer not null check (preco_centavos >= 0),
  quantidade_estoque integer not null default 0,
  estoque_minimo integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index produtos_tenant_id_idx on produtos (tenant_id);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete set null,
  forma_pagamento text not null check (forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito')),
  valor_total_centavos integer not null default 0,
  criado_em timestamptz not null default now()
);
create index vendas_tenant_id_idx on vendas (tenant_id);

create table venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario_centavos integer not null check (preco_unitario_centavos >= 0)
);
create index venda_itens_venda_id_idx on venda_itens (venda_id);

create table movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete cascade,
  venda_id uuid references vendas (id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  motivo text not null default 'manual',
  criado_em timestamptz not null default now()
);
create index movimentacoes_estoque_tenant_id_idx on movimentacoes_estoque (tenant_id);
create index movimentacoes_estoque_produto_id_idx on movimentacoes_estoque (produto_id);

-- Stock is only ever changed by inserting a movimentacao row.
create function aplicar_movimentacao_estoque() returns trigger
language plpgsql as $$
begin
  update produtos
  set quantidade_estoque = quantidade_estoque +
    case when new.tipo = 'entrada' then new.quantidade else -new.quantidade end
  where id = new.produto_id;
  return new;
end;
$$;

create trigger trg_aplicar_movimentacao_estoque
  after insert on movimentacoes_estoque
  for each row execute function aplicar_movimentacao_estoque();
