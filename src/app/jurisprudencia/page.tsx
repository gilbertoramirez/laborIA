"use client";

import { useState } from "react";
import { Search, Plus, Sparkles, ExternalLink, BookOpen } from "lucide-react";

interface Tesis {
  registro: string;
  epoca: string;
  instancia: string;
  tipo: string;
  rubro: string;
  extracto: string;
  relevancia: number;
}

const tesisMock: Tesis[] = [
  {
    registro: "2025/123456",
    epoca: "Undécima Época",
    instancia: "Segunda Sala",
    tipo: "Jurisprudencia",
    rubro:
      "DESPIDO INJUSTIFICADO. LA CARGA DE LA PRUEBA CORRESPONDE AL PATRÓN CUANDO EL TRABAJADOR AFIRMA HABER SIDO DESPEDIDO.",
    extracto:
      "Cuando el trabajador manifiesta que fue despedido injustificadamente y el patrón lo niega, corresponde a este último demostrar que la relación laboral terminó por causa distinta al despido...",
    relevancia: 98,
  },
  {
    registro: "2024/789012",
    epoca: "Undécima Época",
    instancia: "Tribunales Colegiados",
    tipo: "Tesis aislada",
    rubro:
      "SALARIOS CAÍDOS. PROCEDEN DESDE LA FECHA DEL DESPIDO HASTA EL CUMPLIMIENTO DEL LAUDO.",
    extracto:
      "Los salarios caídos constituyen una indemnización por los daños causados al trabajador derivados de la pérdida del empleo, y deben computarse desde la fecha del despido...",
    relevancia: 92,
  },
  {
    registro: "2024/345678",
    epoca: "Undécima Época",
    instancia: "Segunda Sala",
    tipo: "Jurisprudencia",
    rubro:
      "PRIMA DE ANTIGÜEDAD. EL TOPE DE DOS SALARIOS MÍNIMOS APLICA AL SALARIO DIARIO INTEGRADO.",
    extracto:
      "Para el cálculo de la prima de antigüedad prevista en el artículo 162 de la Ley Federal del Trabajo, el salario base de cálculo se topa a dos veces el salario mínimo general...",
    relevancia: 87,
  },
  {
    registro: "2023/901234",
    epoca: "Undécima Época",
    instancia: "Pleno",
    tipo: "Jurisprudencia",
    rubro:
      "CONTROL DE ASISTENCIA. LA OMISIÓN DE EXHIBIRLO GENERA PRESUNCIÓN A FAVOR DEL TRABAJADOR.",
    extracto:
      "Cuando el patrón omite exhibir los registros de control de asistencia, se genera una presunción favorable al trabajador respecto a la jornada laboral manifestada en su demanda...",
    relevancia: 85,
  },
  {
    registro: "2024/567890",
    epoca: "Undécima Época",
    instancia: "Tribunales Colegiados",
    tipo: "Tesis aislada",
    rubro:
      "AGUINALDO PROPORCIONAL. DERECHO DEL TRABAJADOR INDEPENDIENTEMENTE DE LA CAUSA DE TERMINACIÓN.",
    extracto:
      "El aguinaldo proporcional es un derecho irrenunciable del trabajador que se genera por el simple transcurso del tiempo laborado, independientemente de la causa de terminación...",
    relevancia: 79,
  },
];

function relevanciaColor(r: number) {
  if (r >= 90) return "text-brand bg-brand-light";
  if (r >= 80) return "text-amber-700 bg-amber-50";
  return "text-text-muted bg-stone-100";
}

export default function Jurisprudencia() {
  const [query, setQuery] = useState("despido injustificado carga prueba");
  const [results, setResults] = useState<Tesis[]>(tesisMock);
  const [selectedTesis, setSelectedTesis] = useState<Tesis | null>(null);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Jurisprudencia
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Búsqueda de tesis y argumentación con IA
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors">
            <Search size={16} />
            Buscar
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]">
            <Plus size={16} />
            Nuevo caso
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-8 animate-fade-in animate-fade-in-delay-1">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tesis por tema, artículo, o concepto jurídico..."
            className="w-full pl-11 pr-32 py-3.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]">
            <Sparkles size={14} />
            Buscar con IA
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          {results.length} tesis encontradas &middot; Ordenadas por relevancia
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6 animate-fade-in animate-fade-in-delay-2">
        {/* Results list */}
        <div className="col-span-3 space-y-3">
          {results.map((t) => (
            <button
              key={t.registro}
              onClick={() => setSelectedTesis(t)}
              className={`w-full text-left bg-white rounded-xl border p-5 hover:shadow-sm transition-all ${
                selectedTesis?.registro === t.registro
                  ? "border-brand shadow-sm"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{t.epoca}</span>
                  <span>&middot;</span>
                  <span>{t.instancia}</span>
                  <span>&middot;</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.tipo === "Jurisprudencia"
                        ? "bg-brand-light text-brand"
                        : "bg-stone-100 text-text-secondary"
                    }`}
                  >
                    {t.tipo}
                  </span>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold tabular-nums ${relevanciaColor(
                    t.relevancia
                  )}`}
                >
                  {t.relevancia}%
                </span>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1.5 leading-snug">
                {t.rubro}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                {t.extracto}
              </p>
              <p className="text-[10px] text-text-muted mt-2 font-mono">
                Reg. {t.registro}
              </p>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="col-span-2">
          {selectedTesis ? (
            <div className="bg-white rounded-xl border border-border p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-brand" />
                <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                  Detalle de tesis
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                    Registro
                  </p>
                  <p className="text-sm font-mono text-text-primary">
                    {selectedTesis.registro}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                    Rubro
                  </p>
                  <p className="text-sm font-semibold text-text-primary leading-snug">
                    {selectedTesis.rubro}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                    Texto
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {selectedTesis.extracto}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                      Época
                    </p>
                    <p className="text-sm text-text-primary">
                      {selectedTesis.epoca}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                      Instancia
                    </p>
                    <p className="text-sm text-text-primary">
                      {selectedTesis.instancia}
                    </p>
                  </div>
                </div>

                <hr className="border-border" />

                <div className="space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]">
                    <Sparkles size={14} />
                    Generar argumento
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors">
                    <ExternalLink size={14} />
                    Ver fuente completa
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border p-8 text-center">
              <BookOpen
                size={32}
                className="text-text-muted mx-auto mb-3"
              />
              <p className="text-sm text-text-muted">
                Selecciona una tesis para ver el detalle completo y generar
                argumentos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
