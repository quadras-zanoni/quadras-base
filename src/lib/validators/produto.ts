import { z } from "zod";

export const ProdutoInputSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  categoria: z.string().min(1).default("geral"),
  preco_centavos: z.coerce.number().int().nonnegative(),
  custo_centavos: z.coerce.number().int().nonnegative().default(0),
  estoque_minimo: z.coerce.number().int().nonnegative().default(0),
  quantidade_inicial: z.coerce.number().int().nonnegative().default(0),
});

export type ProdutoInput = z.infer<typeof ProdutoInputSchema>;
