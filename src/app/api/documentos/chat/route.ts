import { NextRequest, NextResponse } from "next/server";

const HF_TEXT_GEN_URL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";

export async function POST(request: NextRequest) {
  try {
    const { question, history = [] } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Se requiere una pregunta" },
        { status: 400 }
      );
    }

    const { getSupabaseAdmin } = await import("@/lib/supabase");
    const supabase = getSupabaseAdmin();

    const searchWords = question
      .replace(/[^\w\sáéíóúñü]/gi, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 8);

    const tsquery = searchWords.join(" | ");

    const { data: chunks, error: searchError } = await supabase.rpc(
      "search_documents_text",
      {
        search_query: tsquery,
        match_count: 5,
      }
    );

    if (searchError) {
      console.error("Text search error:", searchError);

      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from("document_chunks")
        .select("id, content, source_filename, chunk_index")
        .or(searchWords.map((w) => `content.ilike.%${w}%`).join(","))
        .limit(5);

      if (fallbackError || !fallbackChunks || fallbackChunks.length === 0) {
        return NextResponse.json({
          answer:
            "No encontré información relevante en los documentos subidos. Intenta con otra pregunta o sube más documentos.",
          sources: [],
        });
      }

      return buildResponse(fallbackChunks.map((c) => ({
        ...c,
        rank: 0,
      })), question, history);
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        answer:
          "No encontré información relevante en los documentos subidos. Intenta con otra pregunta o sube más documentos.",
        sources: [],
      });
    }

    return buildResponse(chunks, question, history);
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Error procesando pregunta" },
      { status: 500 }
    );
  }
}

async function buildResponse(
  chunks: Array<{ content: string; source_filename: string; rank: number }>,
  question: string,
  history: Array<{ role: string; content: string }>
) {
  const context = chunks
    .map(
      (c, i) =>
        `[Fragmento ${i + 1} - ${c.source_filename}]:\n${c.content}`
    )
    .join("\n\n---\n\n");

  const historyText = history
    .slice(-4)
    .map((m) =>
      m.role === "user" ? `Usuario: ${m.content}` : `Asistente: ${m.content}`
    )
    .join("\n");

  const prompt = `<s>[INST] Eres un asistente legal mexicano experto. Responde la pregunta del usuario basándote ÚNICAMENTE en los fragmentos de documentos proporcionados. Si la información no está en los fragmentos, di que no tienes esa información. Responde en español, de forma clara y concisa.

FRAGMENTOS DE DOCUMENTOS:
${context}

${historyText ? `HISTORIAL DE CONVERSACIÓN:\n${historyText}\n\n` : ""}PREGUNTA: ${question} [/INST]`;

  const hfToken = process.env.HUGGINGFACE_API_KEY;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(HF_TEXT_GEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.3,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error("HF text-gen error:", response.status, errText);

      if (response.status === 503) {
        return NextResponse.json({
          answer:
            "El modelo de IA está cargando (puede tardar ~30 segundos). Por favor intenta de nuevo en un momento.",
          sources: chunks.map((c) => ({
            filename: c.source_filename,
            excerpt: c.content.substring(0, 200) + "...",
          })),
          loading: true,
        });
      }

      return NextResponse.json(
        { error: `Error generando respuesta: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    const generatedText =
      Array.isArray(result) && result[0]?.generated_text
        ? result[0].generated_text.trim()
        : "No se pudo generar una respuesta.";

    return NextResponse.json({
      answer: generatedText,
      sources: chunks.map((c) => ({
        filename: c.source_filename,
        excerpt: c.content.substring(0, 200) + "...",
      })),
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const msg =
      fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error("HF text-gen fetch error:", msg);
    return NextResponse.json(
      { error: `Error conectando con IA: ${msg}` },
      { status: 502 }
    );
  }
}
