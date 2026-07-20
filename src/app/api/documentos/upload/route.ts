import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbeddings } from "@/lib/embeddings";
import { parsePDF, parsePlainText } from "@/lib/pdf-parser";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa PDF o TXT." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let chunks;
    try {
      if (file.type === "application/pdf") {
        chunks = await parsePDF(buffer, file.name);
      } else {
        const text = new TextDecoder().decode(buffer);
        chunks = parsePlainText(text, file.name);
      }
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      return NextResponse.json(
        { error: "Error al leer el archivo. Verifica que no esté dañado." },
        { status: 400 }
      );
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del archivo" },
        { status: 400 }
      );
    }

    const texts = chunks.map((c) => c.content);
    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (embErr) {
      console.error("Embedding error:", embErr);
      const msg = embErr instanceof Error ? embErr.message : String(embErr);
      if (msg.includes("abort") || msg.includes("timeout")) {
        return NextResponse.json(
          { error: "Timeout generando embeddings. Intenta con un archivo más corto o reintenta." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "El modelo de IA está cargando. Intenta de nuevo en 30 segundos." },
        { status: 503 }
      );
    }

    const rows = chunks.map((chunk, i) => ({
      content: chunk.content,
      embedding: JSON.stringify(embeddings[i]),
      source_filename: chunk.metadata.source_filename,
      chunk_index: chunk.metadata.chunk_index,
      storage_path: null,
    }));

    const { error: insertError } = await getSupabaseAdmin()
      .from("document_chunks")
      .insert(rows);

    if (insertError) {
      console.error("DB insert error:", insertError);
      return NextResponse.json(
        { error: `Error en base de datos: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      chunks_count: chunks.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error procesando archivo: ${msg}` },
      { status: 500 }
    );
  }
}
