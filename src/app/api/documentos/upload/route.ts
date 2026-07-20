import { NextRequest, NextResponse } from "next/server";

interface DocumentChunk {
  content: string;
  metadata: { chunk_index: number; source_filename: string };
}

function chunkText(
  text: string,
  filename: string,
  maxChunkSize = 1000,
  overlap = 200
): DocumentChunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { chunk_index: chunkIndex, source_filename: filename },
      });
      chunkIndex++;
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(" ") + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { chunk_index: chunkIndex, source_filename: filename },
    });
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se envió archivo" },
        { status: 400 }
      );
    }

    const isPdf =
      file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isTxt =
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md");

    if (!isPdf && !isTxt) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa PDF o TXT." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let chunks: DocumentChunk[];
    try {
      if (isPdf) {
        const { extractText } = await import("unpdf");
        const result = await extractText(new Uint8Array(buffer));
        const text = Array.isArray(result.text)
          ? result.text.join("\n\n")
          : String(result.text || "");
        chunks = chunkText(text, file.name);
      } else {
        const text = new TextDecoder().decode(buffer);
        chunks = chunkText(text, file.name);
      }
    } catch (parseErr) {
      console.error("Parse error:", parseErr);
      return NextResponse.json(
        {
          error: `Error al leer el archivo: ${parseErr instanceof Error ? parseErr.message : "formato no válido"}`,
        },
        { status: 400 }
      );
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del archivo. El documento puede estar vacío o ser solo imágenes." },
        { status: 400 }
      );
    }

    const { getSupabaseAdmin } = await import("@/lib/supabase");

    const rows = chunks.map((chunk) => ({
      content: chunk.content,
      source_filename: chunk.metadata.source_filename,
      chunk_index: chunk.metadata.chunk_index,
      storage_path: null,
    }));

    const { data: inserted, error: insertError } = await getSupabaseAdmin()
      .from("document_chunks")
      .insert(rows)
      .select("id");

    if (insertError) {
      console.error("DB insert error:", insertError);
      return NextResponse.json(
        { error: `Error en base de datos: ${insertError.message}` },
        { status: 500 }
      );
    }

    const chunkIds = (inserted || []).map((r: { id: string }) => r.id);

    return NextResponse.json({
      success: true,
      filename: file.name,
      chunks_count: chunks.length,
      chunk_ids: chunkIds,
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
