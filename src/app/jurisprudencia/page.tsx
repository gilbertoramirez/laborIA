"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Sparkles,
  BookOpen,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Database,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface TesisExterna {
  id: string;
  ius: number;
  registro: string;
  rubro: string;
  texto: string;
  epoca: string;
  instancia: string;
  instanciaAbr: string;
  tipo: string;
  claveTesis: string;
  fechaPublicacion: string;
  localizacion: string;
  fuente: string;
  textoPublicacion: string;
}

interface TesisGuardada {
  id: string;
  registro: string;
  epoca: string;
  instancia: string;
  tipo: string;
  rubro: string;
  texto: string;
  fuente: string;
  similarity: number;
}

type Tab = "externa" | "ia";
type SaveStatus = "idle" | "saving" | "loading-text" | "saved" | "exists" | "error";

export default function Jurisprudencia() {
  const [tab, setTab] = useState<Tab>("externa");
  const [query, setQuery] = useState("");

  const [externResults, setExternResults] = useState<TesisExterna[]>([]);
  const [externSearching, setExternSearching] = useState(false);
  const [externSearched, setExternSearched] = useState(false);
  const [externError, setExternError] = useState("");
  const [externTotal, setExternTotal] = useState(0);
  const [externPage, setExternPage] = useState(1);
  const [externTotalPages, setExternTotalPages] = useState(0);

  const [iaResults, setIaResults] = useState<TesisGuardada[]>([]);
  const [iaSearching, setIaSearching] = useState(false);
  const [iaSearched, setIaSearched] = useState(false);

  const [selectedTesis, setSelectedTesis] = useState<
    TesisExterna | TesisGuardada | null
  >(null);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(
    {}
  );

  async function searchExtern(page: number) {
    if (!query.trim() || externSearching) return;

    setExternSearching(true);
    setExternSearched(true);
    setExternError("");
    setSelectedTesis(null);

    try {
      const res = await fetch("/api/jurisprudencia/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), page, pageSize: 10 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en la búsqueda");
      }

      const data = await res.json();
      setExternResults(data.results || []);
      setExternTotal(data.total || 0);
      setExternPage(data.page || 1);
      setExternTotalPages(data.totalPages || 0);
    } catch (err) {
      setExternError(
        err instanceof Error ? err.message : "Error conectando con el SJF"
      );
      setExternResults([]);
    } finally {
      setExternSearching(false);
    }
  }

  async function handleIaSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || iaSearching) return;

    setIaSearching(true);
    setIaSearched(true);
    setSelectedTesis(null);

    try {
      const res = await fetch("/api/jurisprudencia/buscar-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      });

      if (!res.ok) throw new Error("Error en la búsqueda");

      const data = await res.json();
      setIaResults(data.results);
    } catch {
      setIaResults([]);
    } finally {
      setIaSearching(false);
    }
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (tab === "externa") searchExtern(1);
    else handleIaSearch(e);
  }

  async function fetchTextoAndSave(tesis: TesisExterna) {
    const key = tesis.id;
    let texto = tesis.texto;

    if (!texto) {
      setSaveStatuses((prev) => ({ ...prev, [key]: "loading-text" }));
      try {
        const res = await fetch(`/api/jurisprudencia/buscar?id=${tesis.id}`);
        if (res.ok) {
          const data = await res.json();
          texto = data.tesis?.texto || data.tesis?.rubro || tesis.rubro;
        } else {
          texto = tesis.rubro;
        }
      } catch {
        texto = tesis.rubro;
      }
    }

    setSaveStatuses((prev) => ({ ...prev, [key]: "saving" }));

    try {
      const res = await fetch("/api/jurisprudencia/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tesis: {
            registro: tesis.id,
            epoca: tesis.epoca,
            instancia: tesis.instancia,
            tipo: tesis.tipo,
            rubro: tesis.rubro,
            texto: texto,
          },
        }),
      });

      if (res.status === 409) {
        setSaveStatuses((prev) => ({ ...prev, [key]: "exists" }));
        return;
      }

      if (!res.ok) throw new Error("Error al guardar");

      setSaveStatuses((prev) => ({ ...prev, [key]: "saved" }));
    } catch {
      setSaveStatuses((prev) => ({ ...prev, [key]: "error" }));
    }
  }

  function similarityColor(s: number) {
    if (s >= 0.7) return "text-brand bg-brand-light";
    if (s >= 0.5) return "text-amber-700 bg-amber-50";
    return "text-text-muted bg-stone-100";
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Jurisprudencia
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Busca en el SJF y guarda tesis para búsqueda con IA
          </p>
        </div>
        <Link
          href="/casos?nuevo=1"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]"
        >
          <Plus size={16} />
          Nuevo caso
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1 mb-6 animate-fade-in">
        <button
          onClick={() => setTab("externa")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            tab === "externa"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Globe size={16} />
          Buscar en SCJN
        </button>
        <button
          onClick={() => setTab("ia")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            tab === "ia"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Sparkles size={16} />
          Buscar con IA (mi base)
        </button>
      </div>

      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="mb-8 animate-fade-in animate-fade-in-delay-1"
      >
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "externa"
                ? "Buscar tesis en el Semanario Judicial de la Federación..."
                : "Buscar con IA en tus tesis guardadas..."
            }
            className="w-full pl-11 pr-36 py-3.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
          <button
            type="submit"
            disabled={
              !query.trim() ||
              (tab === "externa" ? externSearching : iaSearching)
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(tab === "externa" ? externSearching : iaSearching) ? (
              <Loader2 size={14} className="animate-spin" />
            ) : tab === "externa" ? (
              <Search size={14} />
            ) : (
              <Sparkles size={14} />
            )}
            {(tab === "externa" ? externSearching : iaSearching)
              ? "Buscando..."
              : tab === "externa"
                ? "Buscar en SJF"
                : "Buscar con IA"}
          </button>
        </div>
      </form>

      {/* ========== External search tab ========== */}
      {tab === "externa" && (
        <>
          {!externSearched && (
            <div className="text-center py-16 animate-fade-in">
              <Globe size={48} className="text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Busca en el Semanario Judicial
              </h2>
              <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                Consulta tesis y jurisprudencias directamente de la SCJN. Guarda
                las que necesites para buscarlas después con IA.
              </p>
              <div className="flex justify-center gap-6 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <Search size={14} />
                  <span>1. Busca en SCJN</span>
                </div>
                <div className="flex items-center gap-2">
                  <Save size={14} />
                  <span>2. Guarda las útiles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} />
                  <span>3. Busca con IA</span>
                </div>
              </div>
            </div>
          )}

          {externError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl mb-6">
              <AlertCircle size={20} className="text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{externError}</p>
            </div>
          )}

          {externSearched && !externSearching && externResults.length === 0 && !externError && (
            <div className="text-center py-16">
              <Search size={48} className="text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Sin resultados
              </h2>
              <p className="text-sm text-text-muted">
                No se encontraron tesis. Intenta con otros términos.
              </p>
            </div>
          )}

          {externResults.length > 0 && (
            <div className="animate-fade-in">
              <p className="text-xs text-text-muted mb-4">
                {externTotal.toLocaleString()} tesis encontradas &middot;
                Página {externPage} de {externTotalPages}
              </p>
              <div className="grid grid-cols-5 gap-6">
                <div className="col-span-3 space-y-3">
                  {externResults.map((t) => {
                    const status = saveStatuses[t.id] || "idle";
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTesis(t)}
                        className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-all cursor-pointer ${
                          selectedTesis && "id" in selectedTesis && selectedTesis.id === t.id
                            ? "border-brand shadow-sm"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                            <span>{t.epoca}</span>
                            <span>&middot;</span>
                            <span>{t.instanciaAbr}</span>
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
                          <SaveButton
                            status={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (status === "idle" || status === "error")
                                fetchTextoAndSave(t);
                            }}
                          />
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary mb-1.5 leading-snug">
                          {t.rubro}
                        </h3>
                        <div className="flex items-center gap-3 text-[10px] text-text-muted mt-2">
                          <span className="font-mono">IUS: {t.ius}</span>
                          {t.claveTesis && (
                            <>
                              <span>&middot;</span>
                              <span>{t.claveTesis}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() => searchExtern(externPage - 1)}
                      disabled={externPage <= 1 || externSearching}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                      Anterior
                    </button>
                    <span className="text-xs text-text-muted">
                      Página {externPage} de {externTotalPages}
                    </span>
                    <button
                      onClick={() => searchExtern(externPage + 1)}
                      disabled={externPage >= externTotalPages || externSearching}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Siguiente
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <DetailPanel
                    tesis={selectedTesis}
                    onClose={() => setSelectedTesis(null)}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== AI search tab ========== */}
      {tab === "ia" && (
        <>
          {!iaSearched && (
            <div className="text-center py-16 animate-fade-in">
              <Database size={48} className="text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Búsqueda semántica con IA
              </h2>
              <p className="text-sm text-text-muted max-w-md mx-auto">
                Busca en tus tesis guardadas usando lenguaje natural. El sistema
                entiende sinónimos y contexto.
              </p>
            </div>
          )}

          {iaSearched && !iaSearching && iaResults.length === 0 && (
            <div className="text-center py-16">
              <Database size={48} className="text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Sin resultados
              </h2>
              <p className="text-sm text-text-muted max-w-md mx-auto">
                No se encontraron tesis en tu base. Primero busca en
                &quot;Buscar en SCJN&quot; y guarda las tesis que necesites.
              </p>
            </div>
          )}

          {iaResults.length > 0 && (
            <div className="animate-fade-in">
              <p className="text-xs text-text-muted mb-4">
                {iaResults.length} resultados &middot; Ordenados por relevancia
                semántica
              </p>
              <div className="grid grid-cols-5 gap-6">
                <div className="col-span-3 space-y-3">
                  {iaResults.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTesis(t)}
                      className={`w-full text-left bg-white rounded-xl border p-5 hover:shadow-sm transition-all ${
                        selectedTesis &&
                        "id" in selectedTesis &&
                        selectedTesis.id === t.id
                          ? "border-brand shadow-sm"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          {t.epoca && <span>{t.epoca}</span>}
                          {t.instancia && (
                            <>
                              <span>&middot;</span>
                              <span>{t.instancia}</span>
                            </>
                          )}
                          {t.tipo && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                t.tipo === "Jurisprudencia"
                                  ? "bg-brand-light text-brand"
                                  : "bg-stone-100 text-text-secondary"
                              }`}
                            >
                              {t.tipo}
                            </span>
                          )}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold tabular-nums ${similarityColor(
                            t.similarity
                          )}`}
                        >
                          {Math.round(t.similarity * 100)}%
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary mb-1.5 leading-snug">
                        {t.rubro}
                      </h3>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                        {t.texto}
                      </p>
                      {t.registro && (
                        <p className="text-[10px] text-text-muted mt-2 font-mono">
                          IUS: {t.registro}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                <div className="col-span-2">
                  <DetailPanel
                    tesis={selectedTesis}
                    onClose={() => setSelectedTesis(null)}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SaveButton({
  status,
  onClick,
}: {
  status: SaveStatus;
  onClick: (e: React.MouseEvent) => void;
}) {
  const config = {
    idle: { icon: Save, label: "Guardar", style: "bg-brand-light text-brand hover:bg-brand/10" },
    "loading-text": { icon: Loader2, label: "Obteniendo texto...", style: "bg-stone-100 text-text-muted" },
    saving: { icon: Loader2, label: "Indexando...", style: "bg-stone-100 text-text-muted" },
    saved: { icon: CheckCircle2, label: "Guardada", style: "bg-green-50 text-green-700" },
    exists: { icon: CheckCircle2, label: "Ya existe", style: "bg-amber-50 text-amber-700" },
    error: { icon: AlertCircle, label: "Reintentar", style: "bg-red-50 text-red-700 hover:bg-red-100" },
  };

  const c = config[status];
  const Icon = c.icon;
  const spinning = status === "loading-text" || status === "saving";

  return (
    <button
      onClick={onClick}
      disabled={spinning || status === "saved" || status === "exists"}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${c.style}`}
    >
      <Icon size={12} className={spinning ? "animate-spin" : ""} />
      {c.label}
    </button>
  );
}

function DetailPanel({
  tesis,
  onClose,
}: {
  tesis: TesisExterna | TesisGuardada | null;
  onClose: () => void;
}) {
  if (!tesis) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center sticky top-8">
        <BookOpen size={32} className="text-text-muted mx-auto mb-3" />
        <p className="text-sm text-text-muted">
          Selecciona una tesis para ver el detalle.
        </p>
      </div>
    );
  }

  const isExterna = "ius" in tesis;
  const rubro = tesis.rubro;
  const texto = tesis.texto;
  const epoca = tesis.epoca;
  const instancia = tesis.instancia;
  const tipo = tesis.tipo;
  const registro = tesis.registro || tesis.id;
  const similarity = "similarity" in tesis ? (tesis as TesisGuardada).similarity : null;
  const claveTesis = isExterna ? (tesis as TesisExterna).claveTesis : "";
  const localizacion = isExterna ? (tesis as TesisExterna).localizacion : "";
  const ius = isExterna ? (tesis as TesisExterna).ius : null;

  return (
    <div className="bg-white rounded-xl border border-border p-6 sticky top-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-brand" />
          <span className="text-xs font-semibold text-brand uppercase tracking-wider">
            Detalle de tesis
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-secondary text-xs"
        >
          Cerrar
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
            Rubro
          </p>
          <p className="text-sm font-semibold text-text-primary leading-snug">
            {rubro}
          </p>
        </div>

        {texto && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              Texto
            </p>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {texto}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {epoca && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                Época
              </p>
              <p className="text-sm text-text-primary">{epoca}</p>
            </div>
          )}
          {instancia && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                Instancia
              </p>
              <p className="text-sm text-text-primary">{instancia}</p>
            </div>
          )}
          {tipo && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                Tipo
              </p>
              <p className="text-sm text-text-primary">{tipo}</p>
            </div>
          )}
          {ius && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                IUS
              </p>
              <p className="text-sm font-mono text-text-primary">{ius}</p>
            </div>
          )}
          {similarity !== null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                Relevancia IA
              </p>
              <p className="text-sm font-bold text-brand">
                {Math.round(similarity * 100)}%
              </p>
            </div>
          )}
        </div>

        {claveTesis && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              Clave
            </p>
            <p className="text-xs font-mono text-text-secondary">
              {claveTesis}
            </p>
          </div>
        )}
        {localizacion && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              Localización
            </p>
            <p className="text-xs text-text-secondary">{localizacion}</p>
          </div>
        )}

        <hr className="border-border" />

        <a
          href={`https://sjf2.scjn.gob.mx/detalle/tesis/${registro}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors"
        >
          <ExternalLink size={14} />
          Ver en SJF
        </a>
      </div>
    </div>
  );
}
