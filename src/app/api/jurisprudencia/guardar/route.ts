import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { tesis } = await request.json();

    if (!tesis || !tesis.rubro || !tesis.texto) {
      return NextResponse.json(
        { error: "Datos de tesis incompletos" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

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

    const textToEmbed = `${tesis.rubro}\n\n${tesis.texto}`;
    const embedding = await generateEmbedding(textToEmbed);

    const { data, error } = await supabase
      .from("tesis_guardadas")
      .insert({
        registro: tesis.registro || "",
        epoca: tesis.epoca || "",
        instancia: tesis.instancia || "",
        tipo: tesis.tipo || "",
        rubro: tesis.rubro,
        texto: tesis.texto,
        embedding: JSON.stringify(embedding),
        fuente: "SJF-SCJN",
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB insert error:", error);
      return NextResponse.json(
        { error: "Error al guardar en base de datos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      message: "Tesis guardada e indexada",
    });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      { error: "Error al procesar la tesis" },
      { status: 500 }
    );
  }
}
