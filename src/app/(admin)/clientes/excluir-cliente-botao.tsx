"use client";

export function ExcluirClienteBotao() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm("Excluir esse cliente permanentemente? Essa ação não pode ser desfeita.")) {
          e.preventDefault();
        }
      }}
      className="text-sm text-red-500 underline hover:text-red-700"
    >
      Excluir
    </button>
  );
}
