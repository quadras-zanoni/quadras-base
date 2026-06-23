import { z } from "zod";

export const ClienteInputSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  telefone: z
    .string()
    .transform((valor) => valor.replace(/\D/g, ""))
    .refine((valor) => valor.length >= 8, "Telefone inválido"),
  cpf: z.string().optional(),
  endereco: z.string().optional(),
});

export type ClienteInput = z.infer<typeof ClienteInputSchema>;
