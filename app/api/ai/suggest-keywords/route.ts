import { requireUser } from "@/lib/supabase/current-user";
import { suggestSearchTargetsFromGemini } from "@/lib/ai/gemini-client";
import { matchSuggestedKeywords } from "@/lib/scian/match-keywords";
import { matchSuggestedScianCodes } from "@/lib/scian/match-scian-codes";

// Each request is a real Gemini API call — being signed in is the only
// other gate, so this caps abuse/cost from a single account hammering it.
// Enforced atomically in Postgres (check_ai_rate_limit, see the
// ai_rate_limit migration) rather than in-memory, since a serverless
// deployment has no single long-lived process to count against.
const AI_RATE_LIMIT = 10;
const AI_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

export async function POST(request: Request) {
  const { supabase } = await requireUser();

  // No user id passed in — the function reads auth.uid() itself from the
  // request's own JWT, so a caller can only ever rate-limit-check their own
  // row (see the ai_rate_limit_auth_uid migration for why that matters).
  const { data: allowed, error: rateLimitError } = await supabase.rpc("check_ai_rate_limit", {
    p_limit: AI_RATE_LIMIT,
    p_window_seconds: AI_RATE_LIMIT_WINDOW_SECONDS,
  });
  if (rateLimitError) {
    console.error("[suggest-keywords] rate limit check failed", rateLimitError);
    return Response.json({ error: "No se pudieron sugerir categorías" }, { status: 502 });
  }
  if (!allowed) {
    return Response.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
      { status: 429 }
    );
  }

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
