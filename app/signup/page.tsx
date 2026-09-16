import { AuthLayout } from "@/components/auth/auth-layout";
import { Logo } from "@/components/ui/logo";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  return (
    <AuthLayout>
      <Logo className="mb-8 h-7 w-[125px]" priority />
      <h1 className="mb-1 text-lg font-semibold text-foreground">Crea tu cuenta</h1>
      <p className="mb-6 text-sm text-muted-foreground">Encuentra clientes potenciales cerca de ti.</p>
      <SignupForm />
    </AuthLayout>
  );
}
