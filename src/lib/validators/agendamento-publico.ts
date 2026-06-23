import { z } from "zod";
import { horaParaMinutos } from "@/lib/agenda";

// See Task 9's note on why this is a regex, not z.string().uuid()/z.uuid()
// (Zod v4 enforces strict RFC4122 variant bits the test fixtures don't have).
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const AgendamentoPublicoInputSchema = z
  .object({
    quadra_id: z.string().regex(uuidRegex),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
    hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
    esporte: z.string().min(1),
    nome: z.string().min(1),
    telefone: z.string().min(8),
  })
  .refine((dados) => horaParaMinutos(dados.hora_fim) > horaParaMinutos(dados.hora_inicio), {
    message: "O horário final deve ser depois do inicial",
  });

export type AgendamentoPublicoInput = z.infer<typeof AgendamentoPublicoInputSchema>;
