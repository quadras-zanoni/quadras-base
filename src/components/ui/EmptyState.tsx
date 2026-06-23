import { type ReactNode } from "react";

export function EmptyState({
  icon,
  titulo,
  descricao,
  acao,
}: {
  icon: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
        {icon}
      </span>
      <p className="text-sm font-medium text-neutral-900">{titulo}</p>
      {descricao ? <p className="max-w-sm text-sm text-neutral-500">{descricao}</p> : null}
      {acao}
    </div>
  );
}
