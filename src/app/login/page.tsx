import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=1");
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form action={login} className="w-full max-w-sm space-y-5 rounded-xl border border-line bg-surface p-8 shadow-lg">
        <div className="flex flex-col items-center gap-1">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent font-bold text-black">GE</span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">Guardião Élyx</h1>
          <p className="text-sm text-muted">Hub de marca e produtos</p>
        </div>
        {error && (
          <p className="rounded-md bg-danger/15 px-3 py-2 text-sm text-danger">
            E-mail ou senha inválidos — ou muitas tentativas seguidas (aguarde 15 minutos).
          </p>
        )}
        <div className="space-y-1">
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="label">Senha</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        <button type="submit" className="btn btn-primary w-full">Entrar</button>
      </form>
    </div>
  );
}
