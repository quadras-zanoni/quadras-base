"use client";

import { useState } from "react";

export function CopiarLinkBotao({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button type="button" onClick={copiar} className="border border-neutral-300 px-3 py-1.5 text-sm">
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}
