import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Se requiere un texto de búsqueda" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Try vector search first
    let results = await tryVectorSearch(supabase, query, limit);

    // Fallback to text search if vector search fails or returns nothing
    if (!results || results.length === 0) {
      results = await textSearch(supabase, query, limit);
    }

    return NextResponse.json({
      results: results || [],
      query,
    });
  } catch (error) {
    console.error("AI search error:", error);
    return NextResponse.json(
      { error: "Error procesando búsqueda" },
      { status: 500 }
    );
  }
}

async function tryVectorSearch(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  query: string,
  limit: number
) {
  try {
    const { generateEmbedding } = await import("@/lib/embeddings");
    const embedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc("search_tesis", {
      query_embedding: JSON.stringify(embedding),
      match_count: limit,
      match_threshold: 0.3,
    });

    if (error) {
      console.error("Vector search error:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Vector search failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function textSearch(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  query: string,
  limit: number
) {
  const searchWords = query
    .replace(/[^\w\sáéíóúñü]/gi, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8);

  if (searchWords.length === 0) return [];

  // Try ilike search on rubro and texto
  const { data, error } = await supabase
    .from("tesis_guardadas")
    .select("id, registro, epoca, instancia, tipo, rubro, texto, fuente")
    .or(
      searchWords
        .flatMap((w) => [`rubro.ilike.%${w}%`, `texto.ilike.%${w}%`])
        .join(",")
    )
    .limit(limit);

  if (error) {
    console.error("Text search error:", error.message);
    return [];
  }

  // Add a basic relevance score based on word matches
  const results = (data || []).map((row) => {
    const combined = `${row.rubro} ${row.texto}`.toLowerCase();
    const matches = searchWords.filter((w) => combined.includes(w.toLowerCase()));
    const similarity = matches.length / searchWords.length;
    return { ...row, similarity };
  });

  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}
