"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopiarLinkBotao({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Button type="button" variant="secondary" onClick={copiar}>
      {copiado ? "Copiado!" : "Copiar link"}
    </Button>
  );
}
