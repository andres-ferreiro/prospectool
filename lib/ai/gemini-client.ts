import { QUICK_PICK_KEYWORDS } from "@/lib/scian/quick-picks";
import { SCIAN_CATALOG } from "@/lib/scian/catalog";

// "-latest" alias rather than a dated model id, so this keeps working as
// Google retires/renames specific model versions over time.
const GEMINI_MODEL = "gemini-flash-latest";
// A real call typically finishes in ~2-3s, but the first request in a
// session and general API latency variance can run well past 8s — a
// cap that tight was causing spurious timeouts on otherwise-successful
// requests, so this leaves more headroom before falling back.
const GEMINI_TIMEOUT_MS = 15000;
// Anchors the model's output style for the "keywords" field without
// spending tokens re-deriving it — a handful of examples is enough to
// convey "short business-category phrase" as the expected shape.
const PROMPT_EXAMPLES = QUICK_PICK_KEYWORDS.slice(0, 18).join(", ");
// The complete catalog as compact "code|title" lines, computed once at
// module load rather than per-request — ~1,086 lines, ~15,600 tokens.
// Sending the full catalog (verified against the real INEGI SCIAN 2023
// revision — see the design doc) means the model can only choose codes
// that genuinely exist, and can't miss a category due to some narrower
// pre-filtering step guessing wrong.
const CATALOG_LINES = SCIAN_CATALOG.map((entry) => `${entry.code}|${entry.title}`).join("\n");

export interface SuggestSearchTargetsInput {
  productService: string;
  targetAudience: string;
}

export interface GeminiSuggestions {
  keywords: string[];
  scianCodes: string[];
}

function buildPrompt({ productService, targetAudience }: SuggestSearchTargetsInput): string {
  return `Eres un asistente que ayuda a negocios en México a identificar qué tipo de negocios buscar como clientes potenciales, usando el catálogo oficial SCIAN (INEGI).

Catálogo SCIAN completo (código|título), un renglón por clase:
${CATALOG_LINES}

Ejemplos de categorías de negocio válidas para "keywords": ${PROMPT_EXAMPLES}.

Producto o servicio del usuario: "${productService}"
Cliente ideal del usuario: "${targetAudience}"

Devuelve un objeto JSON con dos campos:
- "keywords": arreglo de 3 a 6 frases cortas en español (mismo estilo que los ejemplos) que el usuario debería buscar como palabra clave libre.
- "scianCodes": arreglo de 3 a 8 códigos SCIAN de 6 dígitos, elegidos EXCLUSIVAMENTE de los códigos listados arriba, que mejor representen el tipo de negocio de ese cliente ideal.

Responde SOLO con el objeto JSON, sin texto adicional.`;
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

// Pure — extracts and validates the suggestions object from Gemini's
// response shape, independent of the network call so it's unit-testable
// without mocking fetch. A missing or malformed individual field (e.g. the
// model omits "scianCodes") defaults to an empty array rather than
// rejecting the whole response — only a missing/unparseable/non-object
// response is treated as an error.
export function parseGeminiSuggestions(data: unknown): GeminiSuggestions {
  const response = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido");

  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Gemini no devolvió un objeto");
  }

  const obj = parsed as Record<string, unknown>;
  return {
    keywords: extractStringArray(obj.keywords),
    scianCodes: extractStringArray(obj.scianCodes),
  };
}

export async function suggestSearchTargetsFromGemini(
  input: SuggestSearchTargetsInput
): Promise<GeminiSuggestions> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurado");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(input) }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini respondió con estado ${res.status}`);
    }

    const data = await res.json();
    return parseGeminiSuggestions(data);
  } finally {
    clearTimeout(timeout);
  }
}
