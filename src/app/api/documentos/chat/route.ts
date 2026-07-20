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

    let chunks: Array<{
      id: string;
      content: string;
      source_filename: string;
      chunk_index: number;
      rank?: number;
    }> | null = null;

    const tsquery = searchWords.join(" | ");
    const { data: tsChunks, error: searchError } = await supabase.rpc(
      "search_documents_text",
      { search_query: tsquery, match_count: 5 }
    );

    if (!searchError && tsChunks && tsChunks.length > 0) {
      chunks = tsChunks;
    } else {
      if (searchError) console.error("FTS error (using fallback):", searchError);

      const { data: fallbackChunks } = await supabase
        .from("document_chunks")
        .select("id, content, source_filename, chunk_index")
        .or(searchWords.map((w) => `content.ilike.%${w}%`).join(","))
        .limit(5);

      if (fallbackChunks && fallbackChunks.length > 0) {
        chunks = fallbackChunks;
      }
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        answer:
          "No encontré información relevante en los documentos subidos. Intenta con otra pregunta o sube más documentos.",
        sources: [],
      });
    }

    const sources = chunks.map((c) => ({
      filename: c.source_filename,
      excerpt: c.content.substring(0, 200) + "...",
    }));

    const aiAnswer = await tryGenerateAnswer(chunks, question, history);

    if (aiAnswer) {
      return NextResponse.json({ answer: aiAnswer, sources });
    }

    const answer = formatChunksAsAnswer(chunks, question);
    return NextResponse.json({ answer, sources });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Error procesando pregunta" },
      { status: 500 }
    );
  }
}

async function tryGenerateAnswer(
  chunks: Array<{ content: string; source_filename: string }>,
  question: string,
  history: Array<{ role: string; content: string }>
): Promise<string | null> {
  const hfToken = process.env.HUGGINGFACE_API_KEY;
  if (!hfToken) return null;

  const context = chunks
    .map((c, i) => `[${i + 1}. ${c.source_filename}]:\n${c.content}`)
    .join("\n\n---\n\n");

  const historyText = history
    .slice(-4)
    .map((m) =>
      m.role === "user" ? `Usuario: ${m.content}` : `Asistente: ${m.content}`
    )
    .join("\n");

  const prompt = `<s>[INST] Eres un asistente legal mexicano experto. Responde basándote ÚNICAMENTE en los fragmentos. Si la información no está, dilo. Responde en español, claro y conciso.

FRAGMENTOS:
${context}

${historyText ? `HISTORIAL:\n${historyText}\n\n` : ""}PREGUNTA: ${question} [/INST]`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(HF_TEXT_GEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.3,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const result = await response.json();
    if (Array.isArray(result) && result[0]?.generated_text) {
      return result[0].generated_text.trim();
    }
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function formatChunksAsAnswer(
  chunks: Array<{ content: string; source_filename: string }>,
  question: string
): string {
  const intro = `Encontré ${chunks.length} fragmento${chunks.length > 1 ? "s" : ""} relevante${chunks.length > 1 ? "s" : ""} para "${question}":\n\n`;

  const body = chunks
    .map(
      (c, i) =>
        `📄 **${c.source_filename}** (fragmento ${i + 1}):\n${c.content.substring(0, 500)}${c.content.length > 500 ? "..." : ""}`
    )
    .join("\n\n---\n\n");

  return intro + body;
}
