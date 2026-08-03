import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("document_chunks")
      .select("source_filename, storage_path, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("List docs error:", error);
      return NextResponse.json(
        { error: "Error listando documentos" },
        { status: 500 }
      );
    }

    const seen = new Set<string>();
    const docs = (data || [])
      .filter((row) => {
        if (seen.has(row.source_filename)) return false;
        seen.add(row.source_filename);
        return true;
      })
      .map((row) => ({
        filename: row.source_filename,
        storage_path: row.storage_path,
        created_at: row.created_at,
      }));

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json(
      { error: "Error procesando solicitud" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "Se requiere el nombre del archivo" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error, count } = await supabase
      .from("document_chunks")
      .delete({ count: "exact" })
      .eq("source_filename", filename);

    if (error) {
      console.error("Delete doc error:", error);
      return NextResponse.json(
        { error: "Error eliminando documento" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filename,
      chunks_deleted: count ?? 0,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Error procesando solicitud" },
      { status: 500 }
    );
  }
}
