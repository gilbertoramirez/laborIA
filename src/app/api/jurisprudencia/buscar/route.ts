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

function buildSJFPayload(query: string, page: number) {
  return {
    bFacet: true,
    classifiers: [
      {
        name: "idEpoca",
        value: ["210", "200", "100", "5"],
        allSelected: false,
        isMatrix: false,
        visible: false,
      },
      {
        name: "numInstancia",
        value: [
          "6", "60", "7", "70", "8", "80", "1", "10", "2", "20", "3", "30",
          "4", "40", "5", "50",
        ],
        allSelected: false,
        isMatrix: false,
        visible: false,
      },
      {
        name: "tipoDocumento",
        value: ["1"],
        allSelected: false,
        isMatrix: false,
        visible: false,
      },
    ],
    filterExpression: "",
    idApp: "SJFAPP2020",
    ius: [],
    lbSearch: [
      "12a. Época – Todas las Instancias",
      "11a. Época – Todas las Instancias",
      "10a. Época – Todas las Instancias",
      "9a. Época – Todas las Instancias",
    ],
    searchTerms: [
      {
        expression: query,
        fields: ["localizacionBusqueda", "rubro", "texto"],
        fieldsText: "Localización, Rubro (título y subtítulo), Texto",
        fieldsUser: "Localización: \\nRubro (título y subtítulo): \\nTexto: ",
        esInicial: true,
        esNRD: false,
        lsFields: [],
        operator: 0,
        operatorText: "Y",
        operatorUser: "Y",
      },
    ],
    pageNumber: page,
    pageSize: 10,
    sortField: "relevancia",
    sortDirection: "desc",
  };
}

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

function mapDocument(doc: SJFDocument) {
  return {
    id: doc.id,
    ius: doc.ius,
    registro: doc.id,
    rubro: doc.rubro || "(Sin rubro)",
    texto: doc.texto || "",
    epoca: doc.epocaAbr || "",
    instancia: doc.sala || doc.instanciaAbr || "",
    instanciaAbr: doc.instanciaAbr || "",
    tipo:
      doc.ta_tj === 1 || doc.tipoTesis === "1"
        ? "Jurisprudencia"
        : "Tesis aislada",
    claveTesis: doc.claveTesis || "",
    fechaPublicacion: doc.fechaPublicacion || "",
    localizacion: doc.localizacion || "",
    fuente: doc.fuente || "SJF",
    textoPublicacion: doc.textoPublicacion || "",
  };
}

async function fetchSJFPage(
  query: string,
  sjfPage: number,
  signal: AbortSignal
): Promise<{ documents: SJFDocument[]; total: number }> {
  const payload = buildSJFPayload(query, sjfPage);
  const response = await fetch(SJF_SEARCH_URL, {
    method: "POST",
    headers: SJF_HEADERS,
    body: JSON.stringify(payload),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    return { documents: [], total: 0 };
  }

  const data = await response.json();
  return {
    documents: data.documents || [],
    total: data.total || 0,
  };
}

const PAGE_SIZE = 10;

export async function POST(request: NextRequest) {
  try {
    const { query, page = 1 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Se requiere un texto de búsqueda" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const firstSjfPage = (page - 1) * PAGE_SIZE + 1;

      const firstResult = await fetchSJFPage(query, firstSjfPage, controller.signal);
      const total = firstResult.total;

      if (total === 0 || firstResult.documents.length === 0) {
        clearTimeout(timeout);
        return NextResponse.json({
          results: [],
          total: 0,
          totalPages: 0,
          pageSize: PAGE_SIZE,
          query,
          page,
        });
      }

      const apiReturnsOnePerPage = firstResult.documents.length === 1 && total > 1;

      let allDocuments: SJFDocument[];

      if (apiReturnsOnePerPage) {
        const remaining = Math.min(PAGE_SIZE - 1, total - firstSjfPage);
        const batchPromises: Promise<{ documents: SJFDocument[]; total: number }>[] = [];

        for (let i = 1; i <= remaining; i++) {
          batchPromises.push(
            fetchSJFPage(query, firstSjfPage + i, controller.signal)
          );
        }

        const batchResults = await Promise.all(batchPromises);
        clearTimeout(timeout);

        allDocuments = [...firstResult.documents];
        for (const r of batchResults) {
          allDocuments.push(...r.documents);
        }

        const seen = new Set<string>();
        allDocuments = allDocuments.filter((doc) => {
          if (seen.has(doc.id)) return false;
          seen.add(doc.id);
          return true;
        });
      } else {
        clearTimeout(timeout);
        allDocuments = firstResult.documents;
      }

      const results = allDocuments.map(mapDocument);
      const totalPages = apiReturnsOnePerPage
        ? Math.ceil(total / PAGE_SIZE)
        : Math.ceil(total / Math.max(allDocuments.length, 1));

      return NextResponse.json({
        results,
        total,
        totalPages,
        pageSize: results.length,
        query,
        page,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "Tiempo de espera agotado conectando con el SJF" },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(`${SJF_DETAIL_URL}/${id}`, {
        headers: SJF_HEADERS,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Error obteniendo detalle: ${response.status}` },
          { status: 502 }
        );
      }

      const data = await response.json();
      return NextResponse.json({ tesis: data });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const msg =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("SJF detail fetch error:", msg);
      return NextResponse.json(
        { error: `Error conectando con SJF: ${msg}` },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("SJF detail error:", error);
    return NextResponse.json(
      { error: "Error obteniendo detalle" },
      { status: 500 }
    );
  }
}
