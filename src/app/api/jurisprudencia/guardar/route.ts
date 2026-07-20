import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { tesis } = await request.json();

    if (!tesis || !tesis.rubro) {
      return NextResponse.json(
        { error: "Datos de tesis incompletos (falta rubro)" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (tesis.registro) {
      const { data: existing } = await supabase
        .from("tesis_guardadas")
        .select("id")
        .eq("registro", tesis.registro)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "Esta tesis ya está guardada", existing: true },
          { status: 409 }
        );
      }
    }

    const texto = tesis.texto || tesis.rubro;
    const textToEmbed = `${tesis.rubro}\n\n${texto}`;

    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(textToEmbed);
    } catch (embError) {
      console.error("Embedding error (guardando sin embedding):", embError);
    }

    const row: Record<string, unknown> = {
      registro: tesis.registro || `manual-${Date.now()}`,
      epoca: tesis.epoca || "",
      instancia: tesis.instancia || "",
      tipo: tesis.tipo || "",
      rubro: tesis.rubro,
      texto: texto,
      fuente: "SJF-SCJN",
    };

    if (embedding) {
      row.embedding = JSON.stringify(embedding);
    }

    const { data, error } = await supabase
      .from("tesis_guardadas")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.error("DB insert error:", JSON.stringify(error));
      return NextResponse.json(
        { error: `Error en base de datos: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      hasEmbedding: !!embedding,
      message: embedding
        ? "Tesis guardada e indexada"
        : "Tesis guardada (sin embedding, se indexará después)",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Save error:", msg);
    return NextResponse.json(
      { error: `Error al procesar: ${msg}` },
      { status: 500 }
    );
  }
}
