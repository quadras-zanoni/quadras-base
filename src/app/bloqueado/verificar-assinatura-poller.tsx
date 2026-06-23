"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function VerificarAssinaturaPoller({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(async () => {
      const resposta = await fetch(`/api/subscription/check?tenant=${slug}`);
      const status = await resposta.json();
      if (status.ativo) {
        router.replace("/dashboard");
      }
    }, 15000);
    return () => clearInterval(intervalo);
  }, [slug, router]);

  return null;
}
