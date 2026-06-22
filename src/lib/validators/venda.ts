import { z } from "zod";

// See Task 9's note on why this is a regex, not z.string().uuid()/z.uuid()
// (Zod v4 enforces strict RFC4122 variant bits the test fixtures don't have).
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const ItemVendaSchema = z.object({
  produto_id: z.string().regex(uuidRegex),
  quantidade: z.coerce.number().int().positive(),
  preco_unitario_centavos: z.coerce.number().int().nonnegative(),
});

export const VendaInputSchema = z.object({
  cliente_id: z.string().regex(uuidRegex).optional(),
  forma_pagamento: z.enum(["dinheiro", "pix", "debito", "credito"]),
  itens: z.array(ItemVendaSchema).min(1, "Adicione ao menos um item"),
});

export type VendaInput = z.infer<typeof VendaInputSchema>;
