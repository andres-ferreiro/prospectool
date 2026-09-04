import { Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "./signup-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <AuthLayout>
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="size-6" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Revisa tu correo</h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace de confirmación. Ábrelo para activar tu cuenta.
          </p>
        </div>
      ) : (
        <>
          <h1 className="mb-1 text-lg font-semibold text-foreground">Crea tu cuenta</h1>
          <p className="mb-6 text-sm text-muted-foreground">Encuentra clientes potenciales cerca de ti.</p>
          <SignupForm />
        </>
      )}
    </AuthLayout>
  );
}
