import { NextRequest, NextResponse } from "next/server";

if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true; isIdentity = true;
    inverse() { return new DOMMatrixPolyfill(); }
    multiply() { return new DOMMatrixPolyfill(); }
    translate() { return new DOMMatrixPolyfill(); }
    scale() { return new DOMMatrixPolyfill(); }
    rotate() { return new DOMMatrixPolyfill(); }
    transformPoint(p: Record<string, number> = {}) { return { x: p.x || 0, y: p.y || 0, z: p.z || 0, w: p.w || 1 }; }
    static fromMatrix() { return new DOMMatrixPolyfill(); }
    static fromFloat64Array() { return new DOMMatrixPolyfill(); }
    static fromFloat32Array() { return new DOMMatrixPolyfill(); }
  }
  (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixPolyfill;
}

export const maxDuration = 60;

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
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        chunks = chunkText(result.text, file.name);
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

    const { generateEmbeddings } = await import("@/lib/embeddings");

    const texts = chunks.map((c) => c.content);
    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (embErr) {
      console.error("Embedding error:", embErr);
      const msg = embErr instanceof Error ? embErr.message : String(embErr);
      if (msg.includes("abort") || msg.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Timeout generando embeddings. Intenta con un archivo más corto o reintenta.",
          },
          { status: 504 }
        );
      }
      return NextResponse.json(
        {
          error: "El modelo de IA está cargando. Intenta de nuevo en 30 segundos.",
        },
        { status: 503 }
      );
    }

    const { getSupabaseAdmin } = await import("@/lib/supabase");

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
