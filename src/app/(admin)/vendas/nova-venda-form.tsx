"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
}

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
      { produto_id: primeiroProduto.id, quantidade: 1, preco_unitario_centavos: primeiroProduto.preco_centavos },
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
    const resposta = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: clienteId || undefined, forma_pagamento: formaPagamento, itens }),
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
    <div className="space-y-3 border border-neutral-200 p-4">
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <div className="flex gap-2">
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="border border-neutral-300 px-2 py-1 text-sm"
        >
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
          className="border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
      </div>

      {itens.map((item, indice) => (
        <div key={indice} className="flex gap-2">
          <select
            value={item.produto_id}
            onChange={(e) => {
              const produto = produtos.find((p) => p.id === e.target.value);
              atualizarItem(indice, "produto_id", e.target.value);
              if (produto) atualizarItem(indice, "preco_unitario_centavos", produto.preco_centavos);
            }}
            className="border border-neutral-300 px-2 py-1 text-sm"
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
            className="w-20 border border-neutral-300 px-2 py-1 text-sm"
          />
          <button type="button" onClick={() => removerItem(indice)} className="text-neutral-600 underline">
            remover
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button type="button" onClick={adicionarItem} className="border border-neutral-300 px-3 py-1.5 text-sm">
          Adicionar item
        </button>
        <button
          type="button"
          onClick={registrarVenda}
          disabled={itens.length === 0}
          className="bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Registrar venda
        </button>
      </div>
    </div>
  );
}
