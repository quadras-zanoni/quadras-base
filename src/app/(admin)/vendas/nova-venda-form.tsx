"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { reaisParaCentavos } from "@/lib/money";

interface Produto {
  id: string;
  nome: string;
  preco_centavos: number;
}

interface Cliente {
  id: string;
  nome: string;
}

interface ItemCarrinho {
  produto_id: string;
  quantidade: number;
  preco_unitario_centavos: number;
  desconto_reais: string;
}

const selectClass =
  "rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400";

export function NovaVendaForm({ produtos, clientes }: { produtos: Produto[]; clientes: Cliente[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [erro, setErro] = useState<string | null>(null);

  function adicionarItem() {
    const primeiroProduto = produtos[0];
    if (!primeiroProduto) return;
    setItens([
      ...itens,
      {
        produto_id: primeiroProduto.id,
        quantidade: 1,
        preco_unitario_centavos: primeiroProduto.preco_centavos,
        desconto_reais: "",
      },
    ]);
  }

  function atualizarItem(indice: number, campo: keyof ItemCarrinho, valor: string | number) {
    setItens(itens.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(indice: number) {
    setItens(itens.filter((_, i) => i !== indice));
  }

  async function registrarVenda() {
    setErro(null);
    const itensComDesconto = itens.map(({ produto_id, quantidade, preco_unitario_centavos, desconto_reais }) => ({
      produto_id,
      quantidade,
      preco_unitario_centavos: Math.max(0, preco_unitario_centavos - reaisParaCentavos(desconto_reais)),
    }));
    const resposta = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: clienteId || undefined,
        forma_pagamento: formaPagamento,
        itens: itensComDesconto,
      }),
    });
    if (!resposta.ok) {
      const corpo = await resposta.json();
      setErro(typeof corpo.erro === "string" ? corpo.erro : "Erro ao registrar venda");
      return;
    }
    setItens([]);
    router.refresh();
  }

  return (
    <Card className="space-y-4">
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p> : null}

      <div className="flex gap-2">
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={selectClass}>
          <option value="">Sem cliente</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
        <select
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value)}
          className={selectClass}
        >
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
      </div>

      {itens.map((item, indice) => (
        <div key={indice} className="flex items-center gap-2">
          <select
            value={item.produto_id}
            onChange={(e) => {
              const produto = produtos.find((p) => p.id === e.target.value);
              atualizarItem(indice, "produto_id", e.target.value);
              if (produto) atualizarItem(indice, "preco_unitario_centavos", produto.preco_centavos);
            }}
            className={selectClass}
          >
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={item.quantidade}
            onChange={(e) => atualizarItem(indice, "quantidade", Number(e.target.value))}
            className="w-20 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Desconto (R$)"
            value={item.desconto_reais}
            onChange={(e) => atualizarItem(indice, "desconto_reais", e.target.value)}
            className="w-32 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
          <button
            type="button"
            onClick={() => removerItem(indice)}
            className="text-sm text-neutral-500 underline hover:text-neutral-900"
          >
            remover
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={adicionarItem}>
          Adicionar item
        </Button>
        <Button type="button" onClick={registrarVenda} disabled={itens.length === 0}>
          Registrar venda
        </Button>
      </div>
    </Card>
  );
}
