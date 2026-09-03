import { QUICK_PICK_KEYWORDS } from "@/lib/scian/quick-picks";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 8000;
// Anchors the model's output style without spending tokens on the full
// 6,530-row catalog — a handful of examples is enough to convey "short
// business-category phrase" as the expected shape.
const PROMPT_EXAMPLES = QUICK_PICK_KEYWORDS.slice(0, 18).join(", ");

export interface SuggestKeywordsInput {
  productService: string;
  targetAudience: string;
}

function buildPrompt({ productService, targetAudience }: SuggestKeywordsInput): string {
  return `Eres un asistente que ayuda a negocios en México a identificar qué tipo de negocios buscar como clientes potenciales.

Ejemplos de categorías de negocio válidas: ${PROMPT_EXAMPLES}.

Producto o servicio del usuario: "${productService}"
Cliente ideal del usuario: "${targetAudience}"

Devuelve un arreglo JSON de 3 a 6 frases cortas en español que describan tipos de negocio que el usuario debería buscar para encontrar a ese cliente ideal, usando el mismo estilo que los ejemplos (nombres de categorías de negocio, no oraciones completas). Responde SOLO con el arreglo JSON, sin texto adicional.`;
}

// Pure — extracts and validates the keyword array from Gemini's response
// shape, independent of the network call so it's unit-testable without
// mocking fetch.
export function parseGeminiKeywords(data: unknown): string[] {
  const response = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido");

  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Gemini no devolvió un arreglo");

  return parsed.filter((item): item is string => typeof item === "string");
}

export async function suggestKeywordsFromGemini(input: SuggestKeywordsInput): Promise<string[]> {
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
    return parseGeminiKeywords(data);
  } finally {
    clearTimeout(timeout);
  }
}
