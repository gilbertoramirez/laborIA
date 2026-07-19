import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Se requiere un texto de búsqueda" },
        { status: 400 }
      );
    }

    const embedding = await generateEmbedding(query);

    const { data, error } = await getSupabaseAdmin().rpc("search_documents", {
      query_embedding: JSON.stringify(embedding),
      match_count: limit,
      match_threshold: 0.3,
    });

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Error en la búsqueda" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: data || [],
      query,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Error procesando búsqueda" },
      { status: 500 }
    );
  }
}
