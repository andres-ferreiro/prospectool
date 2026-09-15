import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Prospectool",
  description: "Términos y condiciones de uso de Prospectool, aplicables a usuarios en México.",
};

export default function TerminosPage() {
  return (
    <main className="flex min-h-dvh w-full justify-center bg-sheet px-4 py-12 sm:py-16">
      <div className="w-full max-w-3xl">
        <Link href="/" className="mb-8 inline-block">
          <Logo className="h-6 w-[103px]" />
        </Link>

        <article className="prose-legal">
          <h1 className="text-2xl font-semibold text-foreground">Términos y Condiciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Última actualización: 6 de septiembre de 2026</p>

          <section>
            <h2>1. Aceptación de los términos</h2>
            <p>
              Estos Términos y Condiciones ("Términos") regulan el acceso y uso de Prospectool, un producto operado
              por <strong>Nettyo Solutions</strong> ("Nettyo", "Prospectool", "nosotros"), disponible en{" "}
              <strong>prospectool.mx</strong> (el "Servicio"). Al crear una cuenta, marcar la casilla de aceptación
              o utilizar el Servicio de cualquier forma, declaras que has leído, entendido y aceptado quedar
              obligado por estos Términos y por nuestro{" "}
              <Link href="/privacidad">Aviso de Privacidad</Link>, que forma parte integral de este acuerdo. Si no
              estás de acuerdo, no debes usar el Servicio.
            </p>
            <p>
              Para contratar el Servicio debes ser mayor de 18 años y contar con capacidad legal para celebrar
              contratos conforme a la legislación mexicana, actuando en nombre propio o de una persona moral que
              represente legalmente.
            </p>
          </section>

          <section>
            <h2>2. Descripción del Servicio</h2>
            <p>
              Prospectool es una herramienta de prospección comercial que permite buscar negocios en México con
              base en datos públicos del Directorio Estadístico Nacional de Unidades Económicas (DENUE) del INEGI,
              guardarlos como favoritos, convertirlos en oportunidades de venta ("leads") y darles seguimiento
              mediante un tablero tipo CRM, contactos asociados y un calendario de citas.
            </p>
            <p>
              El Servicio se ofrece "tal cual" y "según disponibilidad". Podemos modificar, agregar o discontinuar
              funcionalidades en cualquier momento, procurando dar aviso razonable cuando el cambio afecte
              materialmente funciones que ya utilizas.
            </p>
          </section>

          <section>
            <h2>3. Cuenta de usuario</h2>
            <ul>
              <li>Debes proporcionar información veraz, completa y actualizada al registrarte.</li>
              <li>Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra en tu cuenta.</li>
              <li>Debes notificarnos de inmediato a <a href="mailto:nettyo.solutions@gmail.com">nettyo.solutions@gmail.com</a> si sospechas de un acceso no autorizado a tu cuenta.</li>
              <li>Puedes registrarte con correo y contraseña, o mediante inicio de sesión con Google. Al usar Google, aceptas también los términos de dicho servicio para esa integración.</li>
            </ul>
          </section>

          <section>
            <h2>4. Planes, precios y facturación</h2>
            <p>
              Prospectool ofrece un plan gratuito con funcionalidad limitada (un proyecto, resultados parciales por
              búsqueda, sin acceso al CRM) y planes de pago mensual y anual con funcionalidad completa. Los precios,
              características y promociones vigentes de cada plan se muestran en la página de{" "}
              <Link href="/precios">precios</Link> al momento de la contratación.
            </p>
            <ul>
              <li>
                Todos los precios se muestran en <strong>pesos mexicanos (MXN)</strong> e incluyen, en su caso, el
                Impuesto al Valor Agregado (IVA) conforme a la legislación fiscal aplicable.
              </li>
              <li>
                El pago se procesa a través de nuestro proveedor <strong>Stripe</strong>. Al proporcionar tu método
                de pago, autorizas cargos recurrentes automáticos conforme a la periodicidad del plan elegido
                (mensual o anual), hasta que canceles tu suscripción.
              </li>
              <li>
                Las promociones introductorias (por ejemplo, tarifa reducida el primer mes o periodo de prueba
                gratuito) se renuevan automáticamente al precio regular del plan al finalizar el periodo
                promocional, salvo cancelación previa.
              </li>
              <li>
                Puedes cancelar tu suscripción en cualquier momento desde el portal de autoservicio de facturación
                dentro de la Plataforma. La cancelación surte efecto al final del periodo ya pagado; no se realizan
                cargos posteriores, pero conservas acceso a las funciones de pago hasta que dicho periodo concluya.
              </li>
              <li>
                Conforme a la Ley Federal de Protección al Consumidor, no se realizan reembolsos de periodos ya
                iniciados y utilizados, salvo error de cobro imputable a Nettyo, caso en el cual reembolsaremos el
                monto correspondiente.
              </li>
              <li>Nos reservamos el derecho de modificar los precios de los planes; los cambios no aplicarán retroactivamente a periodos ya pagados y se notificarán antes de la siguiente renovación.</li>
            </ul>
          </section>

          <section>
            <h2>5. Uso aceptable</h2>
            <p>Al usar Prospectool te comprometes a no:</p>
            <ul>
              <li>Usar el Servicio para fines ilícitos, fraudulentos o que infrinjan derechos de terceros.</li>
              <li>Extraer de forma masiva (scraping) o revender los datos de negocios disponibles en la Plataforma fuera del uso normal de prospección para tu propio negocio.</li>
              <li>Usar la información de contacto de los negocios y leads obtenidos a través del Servicio para enviar comunicaciones masivas no solicitadas (spam) que violen la Ley Federal para Prevenir y Sancionar Delitos Cometidos en Materia de Derechos de Autor, la LFPDPPP o disposiciones sobre mensajes comerciales no solicitados.</li>
              <li>Intentar vulnerar la seguridad de la Plataforma, realizar ingeniería inversa, o interferir con su funcionamiento normal.</li>
              <li>Compartir tus credenciales de acceso con terceros ni revender el acceso a tu cuenta.</li>
              <li>Suplantar la identidad de otra persona o proporcionar información falsa al registrarte.</li>
            </ul>
            <p>
              Nos reservamos el derecho de suspender o cancelar cuentas que incumplan este uso aceptable, previo
              aviso salvo en casos de riesgo grave o inminente para el Servicio o terceros.
            </p>
          </section>

          <section>
            <h2>6. Responsabilidad sobre datos de terceros y prospección</h2>
            <p>
              Los datos de negocios disponibles en Prospectool provienen de fuentes públicas (principalmente DENUE
              del INEGI) y se ofrecen con fines de referencia para prospección comercial. No garantizamos la
              exactitud, vigencia o integridad de dichos datos, ya que dependen de la fuente original.
            </p>
            <p>
              Eres el único responsable de verificar la licitud del uso que le des a los datos de contacto que
              obtengas o registres a través del Servicio, incluyendo el cumplimiento de la LFPDPPP y demás
              normatividad aplicable al contactar a personas o negocios identificados a través de la Plataforma.
              Prospectool es una herramienta de organización y seguimiento; no somos parte de, ni responsables por,
              las comunicaciones o negociaciones comerciales que realices con dichos terceros.
            </p>
          </section>

          <section>
            <h2>7. Propiedad intelectual</h2>
            <p>
              El software, diseño, marca, logotipo e interfaz de Prospectool son propiedad de Nettyo Solutions y
              están protegidos por la legislación mexicana e internacional en materia de propiedad intelectual. No
              se te otorga ningún derecho de propiedad sobre el Servicio; únicamente una licencia limitada, no
              exclusiva, intransferible y revocable para usarlo conforme a estos Términos.
            </p>
            <p>
              Los datos y contenido que tú generas dentro de la Plataforma (proyectos, notas, listas de leads)
              siguen siendo tuyos. Nos otorgas una licencia limitada para almacenar y procesar dicho contenido
              únicamente con el fin de prestarte el Servicio.
            </p>
            <p>
              Los datos públicos del DENUE utilizados por la Plataforma son propiedad del INEGI y se usan conforme
              a los términos de uso de dicho directorio público.
            </p>
          </section>

          <section>
            <h2>8. Disponibilidad del Servicio</h2>
            <p>
              Procuramos que el Servicio esté disponible de forma continua, pero no garantizamos operación
              ininterrumpida o libre de errores. Podemos suspender temporalmente el acceso por mantenimiento,
              actualizaciones o causas fuera de nuestro control razonable (caída de proveedores externos como
              Supabase, Stripe, Mapbox, Google o de la fuente de datos DENUE).
            </p>
          </section>

          <section>
            <h2>9. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la legislación mexicana aplicable, Nettyo Solutions no será
              responsable por daños indirectos, incidentales, especiales o consecuenciales derivados del uso o
              imposibilidad de uso del Servicio, incluyendo pérdida de ingresos, clientes o datos, incluso si se
              nos advirtió de la posibilidad de dichos daños.
            </p>
            <p>
              La responsabilidad total de Nettyo Solutions frente a ti por cualquier reclamación relacionada con el
              Servicio no excederá el monto que hayas pagado por tu suscripción durante los tres meses previos al
              evento que dio origen a la reclamación. Esta limitación no aplica en casos de dolo, mala fe o cuando
              la ley mexicana no permita limitar la responsabilidad.
            </p>
          </section>

          <section>
            <h2>10. Terminación</h2>
            <p>
              Puedes dejar de usar el Servicio y eliminar tu cuenta en cualquier momento desde la configuración de
              la Plataforma o escribiéndonos. Podemos suspender o cancelar tu acceso si incumples estos Términos,
              previo aviso razonable salvo en casos de incumplimiento grave, fraude o riesgo para la seguridad del
              Servicio o de terceros.
            </p>
            <p>
              Al terminar tu cuenta, tus datos se eliminarán conforme a lo descrito en nuestro{" "}
              <Link href="/privacidad">Aviso de Privacidad</Link>.
            </p>
          </section>

          <section>
            <h2>11. Modificaciones a estos Términos</h2>
            <p>
              Podemos actualizar estos Términos ocasionalmente. Publicaremos la versión vigente en esta página con
              la fecha de última actualización. Si el cambio es sustancial, te notificaremos por correo electrónico
              o mediante un aviso dentro de la Plataforma con al menos 10 días naturales de anticipación a su
              entrada en vigor. El uso continuado del Servicio después de dicha fecha constituye tu aceptación de
              los Términos actualizados.
            </p>
          </section>

          <section>
            <h2>12. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia
              relacionada con su interpretación o cumplimiento, las partes se someten a los tribunales competentes
              de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles por razón de
              su domicilio presente o futuro.
            </p>
            <p>
              Si eres un consumidor conforme a la Ley Federal de Protección al Consumidor, conservas los derechos
              que dicha ley te otorga, incluyendo la posibilidad de acudir a la Procuraduría Federal del Consumidor
              (PROFECO) para presentar quejas o reclamaciones.
            </p>
          </section>

          <section>
            <h2>13. Contacto</h2>
            <p>
              Para dudas sobre estos Términos, escríbenos a{" "}
              <a href="mailto:nettyo.solutions@gmail.com">nettyo.solutions@gmail.com</a>.
            </p>
          </section>
        </article>

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/privacidad" className="font-medium text-primary hover:underline">
            Ver Aviso de Privacidad
          </Link>
        </p>
      </div>
    </main>
  );
}
