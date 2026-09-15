import { AuthLayout } from "@/components/auth/auth-layout";
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <AuthLayout>
      <Logo className="mb-8 h-7 w-[125px]" priority />
      <h1 className="mb-1 text-lg font-semibold text-foreground">Inicia sesión</h1>
      <p className="mb-6 text-sm text-muted-foreground">Encuentra clientes potenciales cerca de ti.</p>
      <LoginForm next={next} />
    </AuthLayout>
  );
}
