import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbeddings } from "@/lib/embeddings";
import { parsePDF, parsePlainText } from "@/lib/pdf-parser";

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

    const { data: uploadData, error: uploadError } = await getSupabaseAdmin().storage
      .from("documentos")
      .upload(`jurisprudencias/${Date.now()}-${file.name}`, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Error al subir archivo" },
        { status: 500 }
      );
    }

    let chunks;
    if (file.type === "application/pdf") {
      chunks = await parsePDF(buffer, file.name);
    } else {
      const text = new TextDecoder().decode(buffer);
      chunks = parsePlainText(text, file.name);
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del archivo" },
        { status: 400 }
      );
    }

    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    const rows = chunks.map((chunk, i) => ({
      content: chunk.content,
      embedding: JSON.stringify(embeddings[i]),
      source_filename: chunk.metadata.source_filename,
      chunk_index: chunk.metadata.chunk_index,
      storage_path: uploadData.path,
    }));

    const { error: insertError } = await getSupabaseAdmin()
      .from("document_chunks")
      .insert(rows);

    if (insertError) {
      console.error("DB insert error:", insertError);
      return NextResponse.json(
        { error: "Error al guardar en base de datos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      chunks_count: chunks.length,
      storage_path: uploadData.path,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error procesando archivo" },
      { status: 500 }
    );
  }
}
