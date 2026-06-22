create or replace function criar_venda(
  p_tenant_id uuid,
  p_cliente_id uuid,
  p_forma_pagamento text,
  p_itens jsonb
) returns vendas
language plpgsql as $$
declare
  v_venda vendas;
  v_item jsonb;
  v_total integer := 0;
begin
  insert into vendas (tenant_id, cliente_id, forma_pagamento, valor_total_centavos)
  values (p_tenant_id, p_cliente_id, p_forma_pagamento, 0)
  returning * into v_venda;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario_centavos)
    values (
      v_venda.id,
      (v_item->>'produto_id')::uuid,
      (v_item->>'quantidade')::integer,
      (v_item->>'preco_unitario_centavos')::integer
    );

    insert into movimentacoes_estoque (tenant_id, produto_id, venda_id, tipo, quantidade, motivo)
    values (
      p_tenant_id,
      (v_item->>'produto_id')::uuid,
      v_venda.id,
      'saida',
      (v_item->>'quantidade')::integer,
      'venda'
    );

    v_total := v_total + (v_item->>'quantidade')::integer * (v_item->>'preco_unitario_centavos')::integer;
  end loop;

  update vendas set valor_total_centavos = v_total where id = v_venda.id returning * into v_venda;
  return v_venda;
end;
$$;
