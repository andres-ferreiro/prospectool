import { getProject, updateProject, type UpdateProjectInput } from "@/lib/db/projects";
import { parseBaseSearch } from "@/lib/project-base-search";

export async function GET(_request: Request, { params }: RouteContext<"/api/projects/[id]">) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  return Response.json(project);
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/projects/[id]">) {
  const { id } = await params;
  const body = await request.json();

  const patch: UpdateProjectInput = {};

  if (body.productService !== undefined) {
    const productService = typeof body.productService === "string" ? body.productService.trim() : "";
    if (!productService) {
      return Response.json({ error: "Falta describir qué producto o servicio ofreces" }, { status: 400 });
    }
    patch.productService = productService;
  }

  if (body.keywords !== undefined) {
    const rawKeywords: unknown[] = Array.isArray(body.keywords) ? body.keywords : [];
    const cleaned = rawKeywords
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    const keywords = Array.from(new Set(cleaned));
    if (keywords.length === 0) {
      return Response.json({ error: "Falta al menos un tipo de negocio que buscas" }, { status: 400 });
    }
    patch.keywords = keywords;
  }

  if (body.baseSearch !== undefined) {
    const baseSearch = parseBaseSearch(body.baseSearch);
    if (!baseSearch) {
      return Response.json({ error: "Búsqueda del proyecto inválida" }, { status: 400 });
    }
    patch.baseSearch = baseSearch;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const project = await updateProject(id, patch);
  return Response.json(project);
}
