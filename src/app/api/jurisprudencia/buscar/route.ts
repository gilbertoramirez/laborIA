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

function buildSJFPayload(query: string, from: number, size: number) {
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
    from,
    size,
    pageNumber: Math.floor(from / size) + 1,
    pageSize: size,
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

const PAGE_SIZE = 10;

async function getSJFSessionCookies(signal: AbortSignal): Promise<string> {
  try {
    const res = await fetch("https://sjf2.scjn.gob.mx/busqueda-principal-tesis", {
      headers: {
        "User-Agent": SJF_HEADERS["User-Agent"],
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal,
      cache: "no-store",
      redirect: "follow",
    });
    const setCookies = res.headers.getSetCookie?.() || [];
    return setCookies.map((c: string) => c.split(";")[0]).join("; ");
  } catch {
    return "";
  }
}

async function trySJFVariant(
  label: string,
  url: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
  extraHeaders?: Record<string, string>
): Promise<{ label: string; count: number; total: number; ids: string[]; error?: string }> {
  try {
    const headers = { ...SJF_HEADERS, ...extraHeaders };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
      cache: "no-store",
    });
    if (!response.ok) {
      return { label, count: 0, total: 0, ids: [], error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    const docs = Array.isArray(data.documents) ? data.documents : [];
    return {
      label,
      count: docs.length,
      total: data.total || 0,
      ids: docs.map((d: { id: string }) => d.id),
    };
  } catch (e) {
    return { label, count: 0, total: 0, ids: [], error: String(e) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, page = 1, diagnostic = false } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Se requiere un texto de búsqueda" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      if (diagnostic) {
        const baseSearchTerms = [
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
        ];

        const cookies = await getSJFSessionCookies(controller.signal);
        const stdPayload = buildSJFPayload(query, 0, 10);

        const variants = await Promise.all([
          trySJFVariant("with-cookies", SJF_SEARCH_URL, stdPayload, controller.signal,
            cookies ? { Cookie: cookies, "X-Requested-With": "XMLHttpRequest" } : {}),
          trySJFVariant("xhr-header", SJF_SEARCH_URL, stdPayload, controller.signal,
            { "X-Requested-With": "XMLHttpRequest" }),
          trySJFVariant("no-origin", SJF_SEARCH_URL, stdPayload, controller.signal,
            { Origin: "", Referer: "" }),
          trySJFVariant("accept-only-json", SJF_SEARCH_URL, stdPayload, controller.signal,
            { Accept: "application/json" }),
        ]);

        const cookieInfo = cookies ? cookies.substring(0, 100) : "(no cookies returned)";

        clearTimeout(timeout);
        return NextResponse.json({ diagnostic: true, cookies: cookieInfo, variants });
      }

      const from = (page - 1) * PAGE_SIZE;
      const payload = buildSJFPayload(query, from, PAGE_SIZE);

      const response = await fetch(SJF_SEARCH_URL, {
        method: "POST",
        headers: SJF_HEADERS,
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

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
      const total = data.total || 0;
      const results = documents.map(mapDocument);

      return NextResponse.json({
        results,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
        pageSize: results.length || PAGE_SIZE,
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
