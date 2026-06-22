import { z } from "zod";

export const QuadraInputSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo_esporte: z.string().min(1, "Tipo de esporte obrigatório"),
  preco_hora_centavos: z.coerce.number().int().nonnegative(),
});

export type QuadraInput = z.infer<typeof QuadraInputSchema>;
