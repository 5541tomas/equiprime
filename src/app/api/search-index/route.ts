import { getSearchIndex } from "@/lib/catalog";

// Índice da pesquisa, guardado em cache 5 minutos (é o mesmo para todos os visitantes)
export const revalidate = 300;

export async function GET() {
  return Response.json(await getSearchIndex());
}
