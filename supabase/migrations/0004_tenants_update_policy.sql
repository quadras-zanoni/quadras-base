create policy tenants_atualizar_proprio on tenants
  for update using (id = current_tenant_id())
  with check (id = current_tenant_id());
