-- ============================================================
-- Quadras CRM - 0008: DESCONTO por venda (comanda + venda avulsa)
-- ------------------------------------------------------------
-- O dono às vezes cobra menos que a soma dos itens (ex: soma
-- deu R$10,50, cobrou R$10). Esta coluna guarda quanto foi
-- abatido. O `total` da venda continua sendo o BRUTO (soma dos
-- itens); o valor que entrou de fato = total - desconto, e é
-- derivado na LEITURA (relatório, faturamento do dia).
--
-- Por que NÃO mexer no `total`/nas RPCs: as RPCs register_sale,
-- comanda_add_item e comanda_remove_item recalculam o total a
-- cada operação. Se o desconto entrasse no total, o próximo
-- produto lançado o apagaria. Guardando numa coluna própria, o
-- desconto sobrevive e o estoque (transacional) fica intocado.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

alter table sales add column if not exists desconto numeric not null default 0;
