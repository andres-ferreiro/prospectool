import { requireUser } from "@/lib/supabase/current-user";
import { suggestKeywordsFromGemini } from "@/lib/ai/gemini-client";
import { matchSuggestedKeywords } from "@/lib/scian/match-keywords";

export async function POST(request: Request) {
  await requireUser();

  const body = await request.json();
  const productService = typeof body.productService === "string" ? body.productService.trim() : "";
  const targetAudience = typeof body.targetAudience === "string" ? body.targetAudience.trim() : "";

  if (!productService || !targetAudience) {
    return Response.json(
      { error: "Falta describir tu producto/servicio y tu cliente ideal" },
      { status: 400 }
    );
  }

  try {
    const suggested = await suggestKeywordsFromGemini({ productService, targetAudience });
    const keywords = matchSuggestedKeywords(suggested);
    return Response.json({ keywords });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado al sugerir categorías";
    return Response.json({ error: message }, { status: 502 });
  }
}
