"use client";

import { useState } from "react";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";

interface Quadra {
  id: string;
  nome: string;
  tipo_esporte: string;
}

export function FormularioReservaPublica({ token, quadras }: { token: string; quadras: Quadra[] }) {
  const [quadraId, setQuadraId] = useState(quadras[0]?.id ?? "");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  async function enviar() {
    setErro(null);
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
      <p className="text-sm">
        Reserva confirmada! Se abriu o WhatsApp, é só enviar a mensagem pra avisar o dono.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <select
        value={quadraId}
        onChange={(e) => setQuadraId(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      >
        {quadras.map((quadra) => (
          <option key={quadra.id} value={quadra.id}>
            {quadra.nome} ({quadra.tipo_esporte})
          </option>
        ))}
      </select>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="time"
          value={horaFim}
          onChange={(e) => setHoraFim(e.target.value)}
          className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <input
        placeholder="Seu nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <input
        placeholder="Seu telefone/WhatsApp"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button type="button" onClick={enviar} className="w-full bg-black px-3 py-2 text-sm text-white">
        Confirmar reserva
      </button>
    </div>
  );
}
