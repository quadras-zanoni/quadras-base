import { z } from "zod";
import { horaParaMinutos } from "@/lib/agenda";

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const AgendamentoInputSchema = z
  .object({
    quadra_id: z.string().regex(uuidRegex),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
    hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
    recorrente: z.coerce.boolean().default(false),
    cliente_id: z.string().regex(uuidRegex).optional(),
    cliente_novo_nome: z.string().min(1).optional(),
    cliente_novo_telefone: z.string().min(8).optional(),
  })
  .refine((dados) => Boolean(dados.cliente_id) || Boolean(dados.cliente_novo_nome), {
    message: "Informe um cliente existente ou os dados de um cliente novo",
  })
  .refine((dados) => horaParaMinutos(dados.hora_fim) > horaParaMinutos(dados.hora_inicio), {
    message: "O horário final deve ser depois do inicial",
  });

export type AgendamentoInput = z.infer<typeof AgendamentoInputSchema>;
