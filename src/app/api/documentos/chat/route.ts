import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

    const context = chunks
      .map((c, i) => `[${i + 1}. ${c.source_filename}]:\n${c.content}`)
      .join("\n\n---\n\n");

    const historyMessages = history
      .slice(-4)
      .map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      const answer = formatChunksAsAnswer(chunks, question);
      return NextResponse.json({ answer, sources });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "Eres un asistente legal mexicano experto. Responde basándote ÚNICAMENTE en los fragmentos de documentos proporcionados. Si la información no está en los fragmentos, di que no tienes esa información. Responde en español, de forma clara y concisa.",
            },
            ...historyMessages,
            {
              role: "user",
              content: `FRAGMENTOS DE DOCUMENTOS:\n${context}\n\nPREGUNTA: ${question}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error("Groq error:", response.status, await response.text());
        const answer = formatChunksAsAnswer(chunks, question);
        return NextResponse.json({ answer, sources });
      }

      const result = await response.json();
      const generatedText =
        result.choices?.[0]?.message?.content?.trim() ||
        formatChunksAsAnswer(chunks, question);

      return NextResponse.json({ answer: generatedText, sources });
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error("Groq fetch error:", fetchErr);
      const answer = formatChunksAsAnswer(chunks, question);
      return NextResponse.json({ answer, sources });
    }
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Error procesando pregunta" },
      { status: 500 }
    );
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
        `**${c.source_filename}** (fragmento ${i + 1}):\n${c.content.substring(0, 500)}${c.content.length > 500 ? "..." : ""}`
    )
    .join("\n\n---\n\n");

  return intro + body;
}
