"use client";

import { useState } from "react";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { ESPORTES_DISPONIVEIS } from "@/lib/esportes";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Quadra {
  id: string;
  nome: string;
  tipos_esporte: string[];
}

const selectClass =
  "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400";

const optionClass = (selecionado: boolean) =>
  `rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
    selecionado
      ? "border-neutral-900 bg-neutral-900 text-white"
      : "border-neutral-200 text-neutral-700 hover:bg-neutral-100"
  }`;

const DURACOES_PADRAO = [
  { rotulo: "Meia horário", minutos: 30 },
  { rotulo: "1 horário", minutos: 60 },
  { rotulo: "2 horários", minutos: 120 },
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const HORARIOS_PADRAO = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);

function formatarDataISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function proximosDias(quantidade: number) {
  const hoje = new Date();
  return Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    return {
      iso: formatarDataISO(d),
      rotuloDia: i === 0 ? "Hoje" : DIAS_SEMANA[d.getDay()],
      rotuloData: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  });
}

function somarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = (h * 60 + m + minutos + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function FormularioReservaPublica({ token, quadras }: { token: string; quadras: Quadra[] }) {
  const [dias] = useState(() => proximosDias(7));
  const [quadraId, setQuadraId] = useState(quadras[0]?.id ?? "");
  const [data, setData] = useState(dias[0]?.iso ?? "");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [esporte, setEsporte] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const quadraSelecionada = quadras.find((quadra) => quadra.id === quadraId);

  async function enviar() {
    setErro(null);
    if (!data || !horaInicio || !horaFim) {
      setErro("Escolha a data e o horário antes de confirmar.");
      return;
    }
    if (!esporte) {
      setErro("Selecione o esporte antes de confirmar.");
      return;
    }
    if (!nome || !telefone) {
      setErro("Preencha seu nome e WhatsApp antes de confirmar.");
      return;
    }
    setEnviando(true);
    const resposta = await fetch(`/api/public/${token}/agendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quadra_id: quadraId,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        esporte,
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
        <select
          value={quadraId}
          onChange={(e) => {
            setQuadraId(e.target.value);
            setEsporte("");
          }}
          className={selectClass}
        >
          {quadras.map((quadra) => (
            <option key={quadra.id} value={quadra.id}>
              {quadra.nome} ({quadra.tipos_esporte.join(", ")})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Data</label>
        <div className="grid grid-cols-7 gap-1.5">
          {dias.map((dia) => (
            <button
              key={dia.iso}
              type="button"
              onClick={() => setData(dia.iso)}
              className={`${optionClass(data === dia.iso)} flex flex-col items-center py-2.5`}
            >
              <span>{dia.rotuloDia}</span>
              <span className="text-[11px] opacity-80">{dia.rotuloData}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Horário</label>
        <div className="grid grid-cols-4 gap-1.5">
          {HORARIOS_PADRAO.map((horario) => (
            <button
              key={horario}
              type="button"
              onClick={() => {
                setHoraInicio(horario);
                setHoraFim(somarMinutos(horario, 60));
              }}
              className={optionClass(horaInicio === horario)}
            >
              {horario}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Duração</label>
        <div className="flex gap-2">
          {DURACOES_PADRAO.map((duracao) => (
            <button
              key={duracao.minutos}
              type="button"
              disabled={!horaInicio}
              onClick={() => setHoraFim(somarMinutos(horaInicio, duracao.minutos))}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                horaInicio && horaFim === somarMinutos(horaInicio, duracao.minutos)
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {duracao.rotulo}
            </button>
          ))}
        </div>
        {horaInicio && horaFim ? (
          <p className="text-xs text-neutral-500">
            {horaInicio} – {horaFim}
          </p>
        ) : null}
      </div>

      {quadraSelecionada && quadraSelecionada.tipos_esporte.length > 0 ? (
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-500">Esporte</label>
          <div className="flex flex-wrap gap-2">
            {quadraSelecionada.tipos_esporte.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setEsporte(valor)}
                className={optionClass(esporte === valor)}
              >
                {ESPORTES_DISPONIVEIS.find((opcao) => opcao.valor === valor)?.rotulo ?? valor}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
