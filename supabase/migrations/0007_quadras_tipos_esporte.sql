alter table quadras add column tipos_esporte text[] not null default '{}';
update quadras set tipos_esporte = array[tipo_esporte] where tipo_esporte is not null and tipo_esporte <> '';
alter table quadras drop column tipo_esporte;
alter table quadras add constraint quadras_tipos_esporte_nao_vazio check (array_length(tipos_esporte, 1) > 0);
