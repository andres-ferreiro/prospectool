import { createProject, listProjects } from "@/lib/db/projects";

export async function GET() {
  const projects = await listProjects();
  return Response.json({ projects });
}

export async function POST(request: Request) {
  const body = await request.json();

  const productService = typeof body.productService === "string" ? body.productService.trim() : "";
  const rawKeywords: unknown[] = Array.isArray(body.keywords) ? body.keywords : [];
  const cleaned = rawKeywords
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  const keywords: string[] = Array.from(new Set(cleaned));

  if (!productService) {
    return Response.json({ error: "Falta describir qué producto o servicio ofreces" }, { status: 400 });
  }
  if (keywords.length === 0) {
    return Response.json({ error: "Falta al menos un tipo de negocio que buscas" }, { status: 400 });
  }

  const project = await createProject({ productService, keywords });
  return Response.json(project, { status: 201 });
}
