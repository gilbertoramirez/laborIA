import { NextRequest, NextResponse } from "next/server";

const SJF_API_URL =
  "https://sjf2.scjn.gob.mx/services/sjftesismicroservice/api/public/tesis";

export async function POST(request: NextRequest) {
  try {
    const { query, page = 1, pageSize = 10 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Se requiere un texto de búsqueda" },
        { status: 400 }
      );
    }

    const response = await fetch(SJF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://sjf2.scjn.gob.mx",
        Referer: "https://sjf2.scjn.gob.mx/busqueda-principal-tesis",
      },
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

    return NextResponse.json({
      results: data,
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
