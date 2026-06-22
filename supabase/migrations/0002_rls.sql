create function current_tenant_id() returns uuid
language sql stable as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

alter table tenants enable row level security;
alter table quadras enable row level security;
alter table clientes enable row level security;
alter table agendamentos enable row level security;
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;
alter table movimentacoes_estoque enable row level security;

create policy tenants_isolamento on tenants
  for select using (id = current_tenant_id());

create policy quadras_isolamento on quadras
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy clientes_isolamento on clientes
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy agendamentos_isolamento on agendamentos
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy produtos_isolamento on produtos
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy vendas_isolamento on vendas
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy venda_itens_isolamento on venda_itens
  for all using (
    venda_id in (select id from vendas where tenant_id = current_tenant_id())
  )
  with check (
    venda_id in (select id from vendas where tenant_id = current_tenant_id())
  );

create policy movimentacoes_isolamento on movimentacoes_estoque
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());
