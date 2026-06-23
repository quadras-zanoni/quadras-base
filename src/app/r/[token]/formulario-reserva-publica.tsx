"use client";

import { useState } from "react";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Quadra {
  id: string;
  nome: string;
  tipos_esporte: string[];
}

const selectClass =
  "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400";

export function FormularioReservaPublica({ token, quadras }: { token: string; quadras: Quadra[] }) {
  const [quadraId, setQuadraId] = useState(quadras[0]?.id ?? "");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  async function enviar() {
    setErro(null);
    setEnviando(true);
    const resposta = await fetch(`/api/public/${token}/agendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quadra_id: quadraId,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        nome,
        telefone,
      }),
    });
    const corpo = await resposta.json();
    setEnviando(false);
    if (!resposta.ok) {
      setErro(typeof corpo.erro === "string" ? corpo.erro : "Não foi possível reservar esse horário");
      return;
    }
    setConfirmado(true);
    if (corpo.whatsapp_avisos) {
      const mensagem = `Olá! Acabei de reservar a quadra para ${data} às ${horaInicio}. Meu nome é ${nome}.`;
      window.open(gerarLinkWhatsApp(corpo.whatsapp_avisos, mensagem), "_blank");
    }
  }

  if (confirmado) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Reserva confirmada! Se abriu o WhatsApp, é só enviar a mensagem pra avisar o dono.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p> : null}

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Quadra</label>
        <select value={quadraId} onChange={(e) => setQuadraId(e.target.value)} className={selectClass}>
          {quadras.map((quadra) => (
            <option key={quadra.id} value={quadra.id}>
              {quadra.nome} ({quadra.tipos_esporte.join(", ")})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Data</label>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-neutral-500">Início</label>
          <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-neutral-500">Fim</label>
          <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Seu nome</label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Seu WhatsApp</label>
        <Input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(51) 99999-8888"
        />
      </div>

      <Button type="button" onClick={enviar} disabled={enviando} className="w-full">
        {enviando ? "Enviando..." : "Confirmar reserva"}
      </Button>
    </div>
  );
}
