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
} from "lucide-react";
import Link from "next/link";

interface TesisExterna {
  registro?: string;
  epoca?: string;
  instancia?: string;
  tipo?: string;
  rubro?: string;
  texto?: string;
  [key: string]: unknown;
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
type SaveStatus = "idle" | "saving" | "saved" | "exists" | "error";

export default function Jurisprudencia() {
  const [tab, setTab] = useState<Tab>("externa");
  const [query, setQuery] = useState("");

  const [externResults, setExternResults] = useState<TesisExterna[]>([]);
  const [externSearching, setExternSearching] = useState(false);
  const [externSearched, setExternSearched] = useState(false);
  const [externError, setExternError] = useState("");

  const [iaResults, setIaResults] = useState<TesisGuardada[]>([]);
  const [iaSearching, setIaSearching] = useState(false);
  const [iaSearched, setIaSearched] = useState(false);

  const [selectedTesis, setSelectedTesis] = useState<
    TesisExterna | TesisGuardada | null
  >(null);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(
    {}
  );

  async function handleExternSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || externSearching) return;

    setExternSearching(true);
    setExternSearched(true);
    setExternError("");
    setSelectedTesis(null);

    try {
      const res = await fetch("/api/jurisprudencia/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), page: 1, pageSize: 10 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en la búsqueda");
      }

      const data = await res.json();
      const results = Array.isArray(data.results)
        ? data.results
        : data.results?.data || data.results?.tesis || [];
      setExternResults(results);
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en la búsqueda");
      }

      const data = await res.json();
      setIaResults(data.results);
    } catch {
      setIaResults([]);
    } finally {
      setIaSearching(false);
    }
  }

  function handleSearch(e?: React.FormEvent) {
    if (tab === "externa") handleExternSearch(e);
    else handleIaSearch(e);
  }

  async function handleSaveTesis(tesis: TesisExterna) {
    const key = tesis.registro || tesis.rubro || "";
    setSaveStatuses((prev) => ({ ...prev, [key]: "saving" }));

    try {
      const res = await fetch("/api/jurisprudencia/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tesis }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setSaveStatuses((prev) => ({ ...prev, [key]: "exists" }));
        return;
      }

      if (!res.ok) throw new Error(data.error);

      setSaveStatuses((prev) => ({ ...prev, [key]: "saved" }));
    } catch {
      setSaveStatuses((prev) => ({ ...prev, [key]: "error" }));
    }
  }

  function getTesisKey(t: TesisExterna): string {
    return t.registro || t.rubro || JSON.stringify(t).slice(0, 50);
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

      {/* External search tab */}
      {tab === "externa" && (
        <>
          {!externSearched && (
            <div className="text-center py-16 animate-fade-in">
              <Globe size={48} className="text-text-muted mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Busca en el Semanario Judicial
              </h2>
              <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                Busca tesis y jurisprudencias directamente en la base del SJF de
                la SCJN. Guarda las que necesites para buscarlas después con IA.
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
                {externResults.length} resultados del SJF &middot; Haz click en
                &quot;Guardar&quot; para indexar con IA
              </p>
              <div className="grid grid-cols-5 gap-6">
                <div className="col-span-3 space-y-3">
                  {externResults.map((t, i) => {
                    const key = getTesisKey(t);
                    const status = saveStatuses[key] || "idle";
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedTesis(t)}
                        className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-all cursor-pointer ${
                          selectedTesis === t
                            ? "border-brand shadow-sm"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (status === "idle" || status === "error")
                                handleSaveTesis(t);
                            }}
                            disabled={
                              status === "saving" ||
                              status === "saved" ||
                              status === "exists"
                            }
                            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              status === "saved"
                                ? "bg-green-50 text-green-700"
                                : status === "exists"
                                  ? "bg-amber-50 text-amber-700"
                                  : status === "saving"
                                    ? "bg-stone-100 text-text-muted"
                                    : status === "error"
                                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                                      : "bg-brand-light text-brand hover:bg-brand/10"
                            }`}
                          >
                            {status === "saving" && (
                              <Loader2 size={12} className="animate-spin" />
                            )}
                            {status === "saved" && (
                              <CheckCircle2 size={12} />
                            )}
                            {status === "exists" && (
                              <CheckCircle2 size={12} />
                            )}
                            {status === "error" && (
                              <AlertCircle size={12} />
                            )}
                            {status === "idle" && <Save size={12} />}
                            {status === "saving"
                              ? "Guardando..."
                              : status === "saved"
                                ? "Guardada"
                                : status === "exists"
                                  ? "Ya existe"
                                  : status === "error"
                                    ? "Reintentar"
                                    : "Guardar"}
                          </button>
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary mb-1.5 leading-snug">
                          {t.rubro || "(Sin rubro)"}
                        </h3>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                          {(t.texto as string) || (t.extracto as string) || "(Sin texto)"}
                        </p>
                        {t.registro && (
                          <p className="text-[10px] text-text-muted mt-2 font-mono">
                            Reg. {t.registro}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="col-span-2">
                  {selectedTesis ? (
                    <DetailPanel
                      tesis={selectedTesis}
                      onClose={() => setSelectedTesis(null)}
                    />
                  ) : (
                    <EmptyDetail />
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI search tab */}
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
                entiende sinónimos y contexto para encontrar los resultados más
                relevantes.
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
                No se encontraron tesis en tu base. Primero busca en la pestaña
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
                          Reg. {t.registro}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                <div className="col-span-2">
                  {selectedTesis ? (
                    <DetailPanel
                      tesis={selectedTesis}
                      onClose={() => setSelectedTesis(null)}
                    />
                  ) : (
                    <EmptyDetail />
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DetailPanel({
  tesis,
  onClose,
}: {
  tesis: TesisExterna | TesisGuardada;
  onClose: () => void;
}) {
  const rubro = ("rubro" in tesis ? tesis.rubro : "") as string;
  const texto = (("texto" in tesis ? tesis.texto : "") ||
    ("extracto" in tesis ? tesis.extracto : "")) as string;
  const registro = ("registro" in tesis ? tesis.registro : "") as string;
  const epoca = ("epoca" in tesis ? tesis.epoca : "") as string;
  const instancia = ("instancia" in tesis ? tesis.instancia : "") as string;
  const tipo = ("tipo" in tesis ? tesis.tipo : "") as string;
  const similarity =
    "similarity" in tesis ? (tesis as TesisGuardada).similarity : null;

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
        {registro && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              Registro
            </p>
            <p className="text-sm font-mono text-text-primary">{registro}</p>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
            Rubro
          </p>
          <p className="text-sm font-semibold text-text-primary leading-snug">
            {rubro}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
            Texto
          </p>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
            {texto}
          </p>
        </div>

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

        <hr className="border-border" />

        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors">
          <ExternalLink size={14} />
          Ver en SJF
        </button>
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="bg-white rounded-xl border border-border p-8 text-center">
      <BookOpen size={32} className="text-text-muted mx-auto mb-3" />
      <p className="text-sm text-text-muted">
        Selecciona una tesis para ver el detalle completo.
      </p>
    </div>
  );
}
