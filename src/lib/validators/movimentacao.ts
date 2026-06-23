import { z } from "zod";

// See Task 9's note on why this is a regex, not z.string().uuid()/z.uuid()
// (Zod v4 enforces strict RFC4122 variant bits the test fixtures don't have).
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const MovimentacaoInputSchema = z.object({
  produto_id: z.string().regex(uuidRegex),
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.coerce.number().int().positive(),
  motivo: z.string().min(1).default("manual"),
  valor_pago_centavos: z.coerce.number().int().nonnegative().default(0),
});

export type MovimentacaoInput = z.infer<typeof MovimentacaoInputSchema>;
