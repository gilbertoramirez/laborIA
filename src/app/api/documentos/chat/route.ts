import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";

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

    const embedding = await generateEmbedding(question);

    const supabase = getSupabaseAdmin();
    const { data: chunks, error: searchError } = await supabase.rpc(
      "search_documents",
      {
        query_embedding: JSON.stringify(embedding),
        match_count: 5,
        match_threshold: 0.25,
      }
    );

    if (searchError) {
      console.error("RAG search error:", searchError);
      return NextResponse.json(
        { error: "Error buscando en documentos" },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        answer:
          "No encontré información relevante en los documentos subidos. Intenta con otra pregunta o sube más documentos.",
        sources: [],
      });
    }

    const context = chunks
      .map(
        (c: { content: string; source_filename: string; similarity: number }, i: number) =>
          `[Fragmento ${i + 1} - ${c.source_filename} (${Math.round(c.similarity * 100)}% relevancia)]:\n${c.content}`
      )
      .join("\n\n---\n\n");

    const historyText = history
      .slice(-4)
      .map((m: { role: string; content: string }) =>
        m.role === "user" ? `Usuario: ${m.content}` : `Asistente: ${m.content}`
      )
      .join("\n");

    const prompt = `<s>[INST] Eres un asistente legal mexicano experto. Responde la pregunta del usuario basándote ÚNICAMENTE en los fragmentos de documentos proporcionados. Si la información no está en los fragmentos, di que no tienes esa información. Responde en español, de forma clara y concisa.

FRAGMENTOS DE DOCUMENTOS:
${context}

${historyText ? `HISTORIAL DE CONVERSACIÓN:\n${historyText}\n\n` : ""}PREGUNTA: ${question} [/INST]`;

    const hfToken = process.env.HUGGINGFACE_API_KEY;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
            max_new_tokens: 800,
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
            sources: chunks.map(
              (c: { source_filename: string; similarity: number }) => ({
                filename: c.source_filename,
                similarity: c.similarity,
              })
            ),
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
        sources: chunks.map(
          (c: { source_filename: string; similarity: number; content: string }) => ({
            filename: c.source_filename,
            similarity: c.similarity,
            excerpt: c.content.substring(0, 200) + "...",
          })
        ),
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
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Error procesando pregunta" },
      { status: 500 }
    );
  }
}
