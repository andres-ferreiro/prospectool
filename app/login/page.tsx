import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <AuthLayout>
      <h1 className="mb-1 text-lg font-semibold text-foreground">Inicia sesión</h1>
      <p className="mb-6 text-sm text-muted-foreground">Encuentra clientes potenciales cerca de ti.</p>
      <LoginForm next={next} />
    </AuthLayout>
  );
}
