import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Logo } from "@/components/ui/logo";
import { getPendingEmail } from "@/lib/auth/pending-email";
import { VerifyForm } from "./verify-form";

export default async function VerificarSignupPage() {
  // Landing here without a pending signup means the cookie expired or the page
  // was opened directly — send them back rather than showing a dead form.
  const email = await getPendingEmail("signup");
  if (!email) redirect("/signup");

  return (
    <AuthLayout>
      <Logo className="mb-8 h-7 w-[125px]" priority />
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Confirma tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos un código de 6 dígitos a <span className="font-medium text-foreground">{email}</span>. Escríbelo
          aquí para activar tu cuenta.
        </p>
      </div>
      <VerifyForm />
    </AuthLayout>
  );
}
