import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <form action={login} className="w-full max-w-sm space-y-4 border border-neutral-200 p-8">
        <h1 className="text-lg font-semibold">BASE</h1>
        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="w-full border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="senha"
          type="password"
          required
          placeholder="Senha"
          className="w-full border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full bg-black px-3 py-2 text-sm font-medium text-white"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
