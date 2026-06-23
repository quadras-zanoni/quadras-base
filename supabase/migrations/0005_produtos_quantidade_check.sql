alter table produtos
  add constraint produtos_quantidade_estoque_nonneg check (quantidade_estoque >= 0);
