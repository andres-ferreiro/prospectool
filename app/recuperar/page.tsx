import { KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Logo } from "@/components/ui/logo";
import { RequestResetForm } from "./request-form";

export default async function RecuperarPage() {
  return (
    <AuthLayout>
      <Logo className="mb-8 h-7 w-[125px]" priority />
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Recupera tu contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Escribe tu correo y te enviaremos un código de 6 dígitos para crear una contraseña nueva.
        </p>
      </div>
      <RequestResetForm />
    </AuthLayout>
  );
}
