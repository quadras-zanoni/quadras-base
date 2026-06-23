"use client";

export function ExcluirProdutoBotao() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm("Excluir esse produto permanentemente? Essa ação não pode ser desfeita.")) {
          e.preventDefault();
        }
      }}
      className="text-sm text-red-500 underline hover:text-red-700"
    >
      Excluir
    </button>
  );
}
