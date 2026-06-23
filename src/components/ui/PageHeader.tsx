import { type ReactNode } from "react";

export function PageHeader({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {subtitulo ? <p className="mt-1 text-sm text-neutral-500">{subtitulo}</p> : null}
      </div>
      {acao}
    </div>
  );
}
