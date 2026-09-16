import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Logo } from "@/components/ui/logo";
import { getPendingEmail } from "@/lib/auth/pending-email";
import { ResetPasswordForm } from "./reset-form";

export default async function VerificarRecuperacionPage() {
  const email = await getPendingEmail("recovery");
  if (!email) redirect("/recuperar");

  return (
    <AuthLayout>
      <Logo className="mb-8 h-7 w-[125px]" priority />
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Crea una contraseña nueva</h1>
        <p className="text-sm text-muted-foreground">
          Si <span className="font-medium text-foreground">{email}</span> tiene una cuenta, recibirás un código de 6
          dígitos. Escríbelo junto con tu nueva contraseña.
        </p>
      </div>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
