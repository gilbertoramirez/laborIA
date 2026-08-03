import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ContextChunk {
  content: string;
  source_filename: string;
  chunk_index: number;
}

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

    // Search both document_chunks and tesis_guardadas in parallel
    const [docChunks, tesisChunks] = await Promise.all([
      searchDocumentChunks(supabase, searchWords),
      searchTesisGuardadas(supabase, searchWords),
    ]);

    const chunks: ContextChunk[] = [...docChunks, ...tesisChunks];

    if (chunks.length === 0) {
      return NextResponse.json({
        answer:
          "No encontré información relevante en tus documentos ni en tus tesis guardadas. Intenta con otra pregunta, sube más documentos, o guarda tesis desde la sección de Jurisprudencia.",
        sources: [],
      });
    }

    const seen = new Set<string>();
    const sources = chunks
      .map((c) => ({
        filename: c.source_filename,
        chunkIndex: c.chunk_index,
        excerpt: c.content.substring(0, 200) + "...",
      }))
      .filter((s) => {
        if (seen.has(s.filename)) return false;
        seen.add(s.filename);
        return true;
      });

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
                "Eres un asistente legal mexicano experto. Responde basándote ÚNICAMENTE en los fragmentos proporcionados, que pueden venir de documentos subidos o de tesis/jurisprudencias guardadas del SJF. Si la información no está en los fragmentos, di que no tienes esa información. Responde en español, de forma clara y concisa. Cuando cites información, menciona el nombre del documento o tesis fuente.",
            },
            ...historyMessages,
            {
              role: "user",
              content: `FRAGMENTOS DE DOCUMENTOS Y TESIS:\n${context}\n\nPREGUNTA: ${question}`,
            },
          ],
          max_tokens: 1000,
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

async function searchDocumentChunks(
  supabase: ReturnType<Awaited<typeof import("@/lib/supabase")>["getSupabaseAdmin"]>,
  searchWords: string[]
): Promise<ContextChunk[]> {
  if (searchWords.length === 0) return [];

  const tsquery = searchWords.join(" | ");
  const { data: tsChunks, error: searchError } = await supabase.rpc(
    "search_documents_text",
    { search_query: tsquery, match_count: 5 }
  );

  if (!searchError && tsChunks && tsChunks.length > 0) {
    return tsChunks.map((c: { content: string; source_filename: string; chunk_index: number }) => ({
      content: c.content,
      source_filename: c.source_filename,
      chunk_index: c.chunk_index,
    }));
  }

  if (searchError) console.error("FTS error (using fallback):", searchError);

  const { data: fallbackChunks } = await supabase
    .from("document_chunks")
    .select("content, source_filename, chunk_index")
    .or(searchWords.map((w) => `content.ilike.%${w}%`).join(","))
    .limit(5);

  return (fallbackChunks || []).map((c) => ({
    content: c.content,
    source_filename: c.source_filename,
    chunk_index: c.chunk_index,
  }));
}

async function searchTesisGuardadas(
  supabase: ReturnType<Awaited<typeof import("@/lib/supabase")>["getSupabaseAdmin"]>,
  searchWords: string[]
): Promise<ContextChunk[]> {
  if (searchWords.length === 0) return [];

  const { data } = await supabase
    .from("tesis_guardadas")
    .select("rubro, texto, registro")
    .or(
      searchWords
        .flatMap((w) => [`rubro.ilike.%${w}%`, `texto.ilike.%${w}%`])
        .join(",")
    )
    .limit(3);

  return (data || []).map((t, i) => ({
    content: `${t.rubro}\n\n${t.texto}`,
    source_filename: `Tesis ${t.registro || "guardada"}`,
    chunk_index: i,
  }));
}

function formatChunksAsAnswer(
  chunks: ContextChunk[],
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
