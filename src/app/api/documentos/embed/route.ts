import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { chunk_ids } = await request.json();

    if (!Array.isArray(chunk_ids) || chunk_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere chunk_ids" },
        { status: 400 }
      );
    }

    const ids = chunk_ids.slice(0, 3);

    const { getSupabaseAdmin } = await import("@/lib/supabase");
    const supabase = getSupabaseAdmin();

    const { data: chunks, error: fetchError } = await supabase
      .from("document_chunks")
      .select("id, content")
      .in("id", ids)
      .is("embedding", null);

    if (fetchError) {
      return NextResponse.json(
        { error: `Error leyendo chunks: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ processed: 0, done: true });
    }

    const { generateEmbedding } = await import("@/lib/embeddings");

    let processed = 0;
    for (const chunk of chunks) {
      try {
        const embedding = await generateEmbedding(chunk.content);
        const { error: updateError } = await supabase
          .from("document_chunks")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", chunk.id);

        if (updateError) {
          console.error("Embed update error:", updateError);
        } else {
          processed++;
        }
      } catch (embErr) {
        console.error("Embedding error for chunk:", chunk.id, embErr);
        const msg = embErr instanceof Error ? embErr.message : String(embErr);
        if (msg.includes("503")) {
          return NextResponse.json(
            { processed, loading: true, estimated_time: 30 },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { processed, error: `Error generando embedding: ${msg}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ processed, done: true });
  } catch (error) {
    console.error("Embed error:", error);
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error: ${msg}` },
      { status: 500 }
    );
  }
}
