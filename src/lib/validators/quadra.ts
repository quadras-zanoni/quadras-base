import { z } from "zod";

export const QuadraInputSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipos_esporte: z.array(z.string().min(1)).min(1, "Selecione ao menos um esporte"),
  preco_hora_centavos: z.coerce.number().int().nonnegative(),
});

export type QuadraInput = z.infer<typeof QuadraInputSchema>;
