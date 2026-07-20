import { NextRequest, NextResponse } from "next/server";

const SJF_SEARCH_URL =
  "https://sjf2.scjn.gob.mx/services/sjftesismicroservice/api/public/tesis";
const SJF_DETAIL_URL =
  "https://sjf2.scjn.gob.mx/services/sjftesismicroservice/api/public/tesis";

const SJF_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json, text/plain, */*",
  Origin: "https://sjf2.scjn.gob.mx",
  Referer: "https://sjf2.scjn.gob.mx/busqueda-principal-tesis",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

interface SJFDocument {
  id: string;
  ius: number;
  rubro: string;
  texto: string | null;
  epocaAbr: string;
  instanciaAbr: string;
  sala: string;
  claveTesis: string;
  tipoTesis: string;
  ta_tj: number;
  fechaPublicacion: string;
  localizacion: string;
  fuente: string;
  textoPublicacion: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, page = 1, pageSize = 10 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Se requiere un texto de búsqueda" },
        { status: 400 }
      );
    }

    const response = await fetch(SJF_SEARCH_URL, {
      method: "POST",
      headers: SJF_HEADERS,
      body: JSON.stringify({
        searchText: query,
        pageNumber: page,
        pageSize: pageSize,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("SJF API error:", response.status, text);
      return NextResponse.json(
        { error: `Error del SJF: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    const documents: SJFDocument[] = data.documents || [];
    const results = documents.map((doc) => ({
      id: doc.id,
      ius: doc.ius,
      registro: doc.id,
      rubro: doc.rubro || "(Sin rubro)",
      texto: doc.texto || "",
      epoca: doc.epocaAbr || "",
      instancia: doc.sala || doc.instanciaAbr || "",
      instanciaAbr: doc.instanciaAbr || "",
      tipo: doc.ta_tj === 1 || doc.tipoTesis === "1" ? "Jurisprudencia" : "Tesis aislada",
      claveTesis: doc.claveTesis || "",
      fechaPublicacion: doc.fechaPublicacion || "",
      localizacion: doc.localizacion || "",
      fuente: doc.fuente || "SJF",
      textoPublicacion: doc.textoPublicacion || "",
    }));

    return NextResponse.json({
      results,
      total: data.total || 0,
      totalPages: data.totalPage || 0,
      query,
      page,
    });
  } catch (error) {
    console.error("SJF search error:", error);
    return NextResponse.json(
      { error: "Error conectando con el SJF" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Se requiere ID" }, { status: 400 });
    }

    const response = await fetch(`${SJF_DETAIL_URL}/${id}`, {
      headers: SJF_HEADERS,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error obteniendo detalle: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ tesis: data });
  } catch (error) {
    console.error("SJF detail error:", error);
    return NextResponse.json(
      { error: "Error obteniendo detalle" },
      { status: 500 }
    );
  }
}
