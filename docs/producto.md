# Prospectool — Documento de producto

## 1. ¿Qué es Prospectool?

Prospectool es una herramienta web para encontrar clientes potenciales (negocios) cerca de una ubicación y convertirlos en oportunidades de venta reales, sin salir de la misma app: busca, filtra, guarda, contacta y da seguimiento hasta cerrar el trato.

No es solo un buscador de negocios ni solo un CRM — es las dos cosas conectadas: los resultados de una búsqueda se convierten en leads con un clic, y esos leads viven en un pipeline de ventas con seguimiento de contactos y citas.

## 2. El problema que resuelve

Cualquier negocio que vende a otros negocios (B2B) — agencias, proveedores de software, distribuidores, servicios profesionales — enfrenta el mismo cuello de botella al prospectar en México:

- **Encontrar prospectos es lento y manual.** Buscar "restaurantes en la Roma Norte" en Google Maps, copiar cada nombre y teléfono a mano, no escala.
- **Los directorios públicos (como DENUE de INEGI) tienen datos valiosos pero una interfaz pensada para consulta estadística, no para prospección comercial.**
- **Una vez encontrado el prospecto, el seguimiento se pierde en hojas de cálculo o WhatsApp**, sin visibilidad de en qué etapa está cada negocio contactado.
- **Las herramientas que sí resuelven esto (CRMs internacionales, scrapers de Google Places) son caras, están en inglés y no están pensadas para el mercado mexicano.**

## 3. Propuesta de valor

> Encuentra negocios cerca de ti, guárdalos como leads, y dales seguimiento hasta cerrar la venta — todo en una sola herramienta, en español, a precio accesible.

Prospectool combina tres cosas que normalmente requieren herramientas separadas:

1. **Descubrimiento** — un mapa interactivo con datos reales de negocios en México.
2. **Calificación** — guardar, filtrar y organizar los negocios que interesan.
3. **Gestión comercial (CRM)** — mover cada lead por un embudo de ventas, con contactos y citas asociadas.

## 4. A quién está dirigido

- Equipos de ventas y freelancers B2B que prospectan por zona geográfica (agencias, consultoras, proveedores locales).
- Pequeños negocios que buscan nuevos clientes en un giro o colonia específica.
- Emprendedores que necesitan armar una base de prospectos desde cero sin presupuesto para herramientas empresariales.

## 5. Cómo funciona (flujo principal)

1. El usuario crea un **proyecto** (ej. "Clientes para mi agencia de diseño en CDMX").
2. Define palabras clave y, opcionalmente, usa **sugerencias con IA** para ampliar el giro de negocio a buscar.
3. Explora el **mapa interactivo**, ajusta el radio de búsqueda y filtra por categoría (árbol de categorías/giros SCIAN).
4. Ve el detalle de cada negocio (dirección, teléfono, correo, sitio web) y lo **guarda** como favorito o lo marca como **lead**.
5. El lead entra al **CRM** en la etapa "Contactado" y avanza manualmente por el embudo: Contactado → Interesado → Negociando → Ganado (o Perdido).
6. Agrega **contactos** (nombre, teléfono, correo) a cada lead y agenda **citas o llamadas** desde el calendario, vinculadas al lead o al negocio.
7. Dar seguimiento es tan simple como abrir el proyecto y ver en qué etapa está cada prospecto.

## 6. Funcionalidades actuales

### Búsqueda y descubrimiento
- Mapa interactivo (Mapbox) centrado en la ubicación de búsqueda.
- Búsqueda por palabra clave y radio, con datos oficiales del **DENUE** (Directorio Estadístico Nacional de Unidades Económicas, INEGI) — la fuente de datos de negocios más completa y gratuita de México.
- Árbol de categorías avanzado (códigos de giro SCIAN) para búsquedas más precisas por industria.
- Sugerencia de palabras clave con IA para ampliar el alcance de una búsqueda.
- Resultados en lista y en mapa, sincronizados.
- Caché de búsquedas (por proyecto) para no repetir consultas idénticas.

### Gestión de negocios y leads
- Ficha de detalle por negocio: nombre, dirección, colonia, código postal, teléfono, correo, sitio web.
- Lista de **guardados** (wishlist) — negocios de interés que aún no se convierten en lead.
- Conversión de un negocio guardado (o resultado de búsqueda) en **lead** con un clic.
- Múltiples **contactos** por lead (ej. recepción y dueño).

### CRM / pipeline de ventas
- Tablero Kanban (escritorio) y vista de lista con selector de etapa (móvil) para el pipeline: Contactado, Interesado, Negociando, Ganado, Perdido.
- Embudo visual (funnel) que muestra cuántos leads hay en cada etapa.
- Historial de actividad por lead (cambios de etapa).
- Búsqueda y filtrado de leads dentro de un proyecto.

### Calendario y citas
- Agenda de citas vinculadas a un lead, a un negocio, o independientes.
- Vistas de calendario (mes/día/agenda).
- Próxima cita visible directamente desde la ficha del lead o del negocio.

### Cuenta y planes
- Registro e inicio de sesión con correo/contraseña o Google.
- Proyectos múltiples por cuenta (ilimitados en plan de pago).
- Suscripción mensual y anual vía Stripe, con portal de autoservicio para gestionar el pago.
- Plan gratuito limitado (primeros resultados de cada búsqueda, un solo proyecto) para probar la herramienta antes de pagar.
- Progressive Web App (PWA) — instalable en el teléfono como app nativa.

## 7. Planes y precios (actuales)

| Plan | Precio | Notas |
|---|---|---|
| Gratis | $0 | 1 proyecto, primeros 10 resultados por búsqueda, sin CRM |
| Mensual | $5 MXN el primer mes, luego $49 MXN/mes | Cancela cuando quieras |
| Anual | 7 días gratis, luego $399 MXN/año | Recomendado, mejor precio por mes |

Planes de pago incluyen: proyectos ilimitados, todos los resultados de cada búsqueda, y CRM completo (embudo, contactos, calendario).

## 8. Lo que nos diferencia

- **Datos oficiales y gratuitos como base** (DENUE/INEGI) en vez de depender de APIs de pago por consulta — esto permite mantener un precio bajo sin sacrificar cobertura en México.
- **Todo en español**, pensado para el flujo de trabajo de un vendedor o dueño de negocio mexicano, no una traducción de una herramienta gringa.
- **Búsqueda + CRM en un solo lugar** — no hay que exportar resultados a otra herramienta para darles seguimiento.
- **Precio de entrada mínimo** ($5 el primer mes) para que probar la herramienta no sea una decisión difícil.

## 9. Roadmap / en evaluación

Estas ideas están en discusión, no implementadas todavía:

- **Programa de referidos**: recompensa de un mes gratis tanto para quien recomienda como para quien se suscribe por esa recomendación, activado solo cuando el referido paga su primera suscripción.
- **Expansión de datos con Google Places/Maps**: evaluado como opción para cobertura fuera de México o datos más ricos (reseñas, horarios), pendiente de validar si el modelo de precio actual lo soporta — el costo por consulta de Google no es gratuito como DENUE, así que requeriría ajustar precios o limitarlo a un plan superior.
- **Expansión más allá de México**: depende de resolver el punto anterior, ya que DENUE es una fuente de datos exclusiva de México.
