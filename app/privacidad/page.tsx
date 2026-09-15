import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Aviso de Privacidad — Prospectool",
  description:
    "Aviso de privacidad de Prospectool conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).",
};

export default function PrivacidadPage() {
  return (
    <main className="flex min-h-dvh w-full justify-center bg-sheet px-4 py-12 sm:py-16">
      <div className="w-full max-w-3xl">
        <Link href="/" className="mb-8 inline-block">
          <Logo className="h-6 w-[103px]" />
        </Link>

        <article className="prose-legal">
          <h1 className="text-2xl font-semibold text-foreground">Aviso de Privacidad</h1>
          <p className="mt-1 text-sm text-muted-foreground">Última actualización: 6 de septiembre de 2026</p>

          <section>
            <h2>1. Responsable del tratamiento de datos personales</h2>
            <p>
              <strong>Nettyo Solutions</strong> ("Nettyo", "Prospectool", "nosotros"), con domicilio para oír y
              recibir notificaciones en Ciudad de México, México, y correo electrónico de contacto{" "}
              <a href="mailto:nettyo.solutions@gmail.com">nettyo.solutions@gmail.com</a>, es responsable del
              tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en
              Posesión de los Particulares (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad
              emitidos por el INAI.
            </p>
            <p>
              Este Aviso de Privacidad aplica al sitio web y aplicación Prospectool (
              <strong>prospectool.mx</strong> y subdominios, en adelante la "Plataforma"), disponible en
              navegador y como aplicación web progresiva (PWA).
            </p>
          </section>

          <section>
            <h2>2. Datos personales que recabamos</h2>
            <p>Recabamos los siguientes datos personales, directamente de ti o de forma automática:</p>
            <h3>2.1 Datos que nos proporcionas</h3>
            <ul>
              <li>Datos de identificación y contacto: nombre, correo electrónico.</li>
              <li>Credenciales de acceso: contraseña (almacenada de forma cifrada, nunca en texto plano).</li>
              <li>
                Datos de tu cuenta de Google, si eliges iniciar sesión con Google: nombre, correo electrónico y foto
                de perfil, conforme a los permisos que autorices en ese momento.
              </li>
              <li>
                Datos de facturación y pago: al contratar un plan de pago, tu información de tarjeta y facturación es
                capturada y procesada directamente por nuestro proveedor de pagos, <strong>Stripe, Inc.</strong> —
                Prospectool nunca recibe ni almacena el número completo de tu tarjeta.
              </li>
              <li>
                Contenido que generas dentro de la Plataforma: proyectos, palabras clave de búsqueda, negocios
                guardados, leads, notas, etapas del embudo de ventas, contactos de leads y citas que registres.
              </li>
              <li>Comunicaciones que nos envíes por correo electrónico o formularios de soporte.</li>
            </ul>
            <h3>2.2 Datos que recabamos automáticamente</h3>
            <ul>
              <li>Datos técnicos: dirección IP, tipo de dispositivo y navegador, sistema operativo, idioma.</li>
              <li>Datos de uso: páginas visitadas, acciones realizadas dentro de la Plataforma, fecha y hora de acceso.</li>
              <li>
                Cookies y tecnologías similares estrictamente necesarias para mantener tu sesión iniciada y para el
                funcionamiento de la Plataforma. No utilizamos cookies de publicidad de terceros.
              </li>
              <li>
                Datos aproximados de ubicación, únicamente cuando otorgas permiso expreso a tu navegador, para
                centrar el mapa de búsqueda en tu zona.
              </li>
            </ul>
            <h3>2.3 Datos de terceros que procesas dentro de la Plataforma</h3>
            <p>
              Prospectool te permite consultar y guardar información de negocios públicos de México (nombre
              comercial, giro, dirección, colonia, código postal, teléfono, correo y/o sitio web), obtenida del{" "}
              <strong>Directorio Estadístico Nacional de Unidades Económicas (DENUE)</strong> del INEGI, una fuente
              pública y oficial. Cuando conviertes uno de estos negocios en "lead" y agregas datos de contacto
              adicionales (por ejemplo, el nombre de una persona de contacto), <strong>tú actúas como responsable</strong>{" "}
              del tratamiento de esos datos frente a esas personas, y Prospectool actúa únicamente como encargado
              técnico que almacena esa información por tu cuenta. Es tu responsabilidad usar esos datos conforme a
              la legislación aplicable, incluyendo, en su caso, obtener el consentimiento necesario para contactar a
              esas personas y atender cualquier solicitud de acceso, rectificación, cancelación u oposición (ARCO)
              que te formulen directamente.
            </p>
            <p>No solicitamos ni tratamos datos personales sensibles (salud, origen étnico, creencias religiosas, afiliación sindical o política, preferencia sexual, etc.). Te pedimos no ingresar este tipo de datos en la Plataforma.</p>
          </section>

          <section>
            <h2>3. Finalidades del tratamiento</h2>
            <p>Tus datos personales se utilizan para las siguientes finalidades, necesarias para el servicio que solicitas:</p>
            <ul>
              <li>Crear y administrar tu cuenta de usuario y autenticarte de forma segura.</li>
              <li>Proveer la funcionalidad de la Plataforma: búsqueda de negocios, gestión de proyectos, CRM, calendario de citas.</li>
              <li>Procesar el pago de tu suscripción y gestionar tu facturación a través de Stripe.</li>
              <li>Enviarte correos operativos: confirmación de cuenta, restablecimiento de contraseña, recibos, avisos sobre tu suscripción.</li>
              <li>Brindarte soporte técnico y atender tus solicitudes.</li>
              <li>Detectar y prevenir fraude, abuso o uso indebido de la Plataforma.</li>
              <li>Cumplir con obligaciones legales, fiscales y contables aplicables en México.</li>
            </ul>
            <p>Adicionalmente, y sólo si lo autorizas, podemos usar tu correo electrónico para las siguientes finalidades secundarias:</p>
            <ul>
              <li>Enviarte comunicaciones sobre nuevas funcionalidades, mejoras o promociones de Prospectool.</li>
              <li>Solicitarte retroalimentación sobre tu experiencia con la Plataforma.</li>
            </ul>
            <p>
              Puedes oponerte al tratamiento de tus datos para estas finalidades secundarias en cualquier momento,
              sin que ello afecte el uso del servicio contratado, escribiendo a{" "}
              <a href="mailto:nettyo.solutions@gmail.com">nettyo.solutions@gmail.com</a> o mediante el enlace de
              baja incluido en nuestros correos.
            </p>
          </section>

          <section>
            <h2>4. Uso de inteligencia artificial</h2>
            <p>
              La función de "sugerencia de palabras clave con IA" envía el texto que ingresas (giro de negocio o
              descripción de tu búsqueda) al proveedor <strong>Google (Gemini API)</strong> para generar sugerencias.
              No envíamos datos de identificación personal de tu cuenta como parte de esas solicitudes. Evita incluir
              datos personales sensibles o de terceros al usar esta función.
            </p>
          </section>

          <section>
            <h2>5. Transferencias y encargados de datos personales</h2>
            <p>
              No vendemos tus datos personales. Compartimos datos únicamente con los siguientes encargados, que
              procesan información en nuestro nombre y bajo instrucciones contractuales, exclusivamente para prestar
              el servicio:
            </p>
            <ul>
              <li><strong>Supabase, Inc.</strong> — alojamiento de base de datos y autenticación de usuarios.</li>
              <li><strong>Stripe, Inc.</strong> — procesamiento de pagos y facturación de suscripciones.</li>
              <li><strong>Google LLC</strong> — inicio de sesión con Google (OAuth) y sugerencias de palabras clave con IA (Gemini API).</li>
              <li><strong>Mapbox, Inc.</strong> — renderizado de mapas y búsqueda de direcciones.</li>
              <li>Proveedores de infraestructura y hospedaje (por ejemplo, Vercel Inc.) necesarios para operar la Plataforma.</li>
            </ul>
            <p>
              Algunos de estos proveedores se encuentran fuera de México (principalmente Estados Unidos). Al usar la
              Plataforma consientes estas transferencias internacionales, necesarias para la prestación del
              servicio, mismas que se realizan bajo los estándares de protección de datos exigidos contractualmente
              a dichos proveedores. No realizamos transferencias de datos a terceros para fines distintos a los
              aquí descritos sin tu consentimiento.
            </p>
          </section>

          <section>
            <h2>6. Derechos ARCO y revocación del consentimiento</h2>
            <p>
              Tienes derecho a Acceder a tus datos personales, Rectificarlos si son inexactos, Cancelarlos cuando
              consideres que no se requieren para alguna de las finalidades señaladas, u Oponerte al tratamiento de
              los mismos para fines específicos (derechos ARCO). También puedes revocar en cualquier momento el
              consentimiento que nos hayas otorgado.
            </p>
            <p>Para ejercer estos derechos, envía tu solicitud a <a href="mailto:nettyo.solutions@gmail.com">nettyo.solutions@gmail.com</a>, indicando:</p>
            <ul>
              <li>Nombre completo y correo electrónico asociado a tu cuenta.</li>
              <li>Descripción clara del derecho que deseas ejercer.</li>
              <li>Cualquier documento que sustente tu solicitud.</li>
              <li>Un correo electrónico para comunicarte la respuesta.</li>
            </ul>
            <p>
              Te responderemos en un plazo máximo de 20 días hábiles contados desde la fecha en que recibimos tu
              solicitud, conforme al artículo 32 de la LFPDPPP, y de resultar procedente, la haremos efectiva dentro
              de los 15 días hábiles siguientes.
            </p>
            <p>
              También puedes eliminar tu cuenta y los datos asociados a ella directamente desde la configuración de
              la Plataforma, o solicitándolo por correo electrónico.
            </p>
          </section>

          <section>
            <h2>7. Uso de cookies y tecnologías de rastreo</h2>
            <p>
              Utilizamos cookies propias y de sesión estrictamente necesarias para el funcionamiento de la
              Plataforma (mantener tu sesión iniciada, recordar preferencias de tema claro/oscuro). No utilizamos
              cookies de rastreo publicitario ni compartimos datos de navegación con redes publicitarias. Puedes
              deshabilitar las cookies desde la configuración de tu navegador, aunque esto puede impedir el
              funcionamiento correcto de la Plataforma.
            </p>
          </section>

          <section>
            <h2>8. Medidas de seguridad</h2>
            <p>
              Implementamos medidas de seguridad administrativas, técnicas y físicas razonables para proteger tus
              datos personales contra daño, pérdida, alteración, destrucción o uso, acceso o tratamiento no
              autorizado, incluyendo cifrado de contraseñas, conexiones cifradas (HTTPS/TLS), control de acceso
              basado en roles y aislamiento de datos por proyecto (Row Level Security). Ningún sistema es
              completamente infalible; ante cualquier incidente de seguridad que afecte tus datos personales, te lo
              notificaremos conforme a la ley aplicable.
            </p>
          </section>

          <section>
            <h2>9. Conservación de datos</h2>
            <p>
              Conservamos tus datos personales mientras mantengas una cuenta activa en la Plataforma y durante el
              plazo adicional necesario para cumplir con obligaciones legales, fiscales o contables. Al eliminar tu
              cuenta, eliminamos o anonimizamos tus datos personales, salvo aquella información que debamos
              conservar por obligación legal (por ejemplo, comprobantes fiscales de pagos realizados).
            </p>
          </section>

          <section>
            <h2>10. Menores de edad</h2>
            <p>
              La Plataforma está dirigida a personas mayores de 18 años que actúan en representación de un negocio
              o actividad profesional. No recabamos conscientemente datos de menores de edad. Si detectamos que un
              menor de edad nos ha proporcionado datos personales, procederemos a eliminarlos.
            </p>
          </section>

          <section>
            <h2>11. Cambios al Aviso de Privacidad</h2>
            <p>
              Podemos modificar este Aviso de Privacidad para cumplir con actualizaciones legislativas, políticas
              internas o nuevos requerimientos del servicio. Publicaremos cualquier cambio en esta misma página,
              indicando la fecha de última actualización. Si el cambio es sustancial, te lo notificaremos por
              correo electrónico o mediante un aviso visible en la Plataforma antes de que entre en vigor.
            </p>
          </section>

          <section>
            <h2>12. Autoridad de control</h2>
            <p>
              Si consideras que tu derecho a la protección de datos personales ha sido lesionado por alguna
              conducta de nuestra parte, o presumes alguna violación a las disposiciones de la LFPDPPP, puedes
              acudir al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos
              Personales (INAI): <a href="https://home.inai.org.mx" target="_blank" rel="noreferrer">home.inai.org.mx</a>.
            </p>
          </section>

          <section>
            <h2>13. Contacto</h2>
            <p>
              Para cualquier duda relacionada con este Aviso de Privacidad, escríbenos a{" "}
              <a href="mailto:nettyo.solutions@gmail.com">nettyo.solutions@gmail.com</a>.
            </p>
          </section>
        </article>

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/terminos" className="font-medium text-primary hover:underline">
            Ver Términos y Condiciones
          </Link>
        </p>
      </div>
    </main>
  );
}
