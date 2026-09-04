import { requireUser } from "@/lib/supabase/current-user";
import { suggestSearchTargetsFromGemini } from "@/lib/ai/gemini-client";
import { matchSuggestedKeywords } from "@/lib/scian/match-keywords";
import { matchSuggestedScianCodes } from "@/lib/scian/match-scian-codes";

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
    const suggestions = await suggestSearchTargetsFromGemini({ productService, targetAudience });
    const keywords = matchSuggestedKeywords(suggestions.keywords);
    const scianCodes = matchSuggestedScianCodes(suggestions.scianCodes);
    return Response.json({ keywords, scianCodes, projectName: suggestions.projectName });
  } catch (err) {
    console.error("[suggest-keywords]", err);
    return Response.json({ error: "No se pudieron sugerir categorías" }, { status: 502 });
  }
}
