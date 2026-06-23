alter table produtos
  add column custo_centavos integer not null default 0 check (custo_centavos >= 0);
