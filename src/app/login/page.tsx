import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50">
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold tracking-tight">BASE</h1>
        {erro ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>
        ) : null}
        <Input name="email" type="email" required placeholder="E-mail" />
        <Input name="senha" type="password" required placeholder="Senha" />
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </main>
  );
}
