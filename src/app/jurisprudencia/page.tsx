"use client";

import { useState, useRef } from "react";
import {
  Search,
  Plus,
  Sparkles,
  BookOpen,
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  content: string;
  source_filename: string;
  chunk_index: number;
  similarity: number;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function Jurisprudencia() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || searching) return;

    setSearching(true);
    setHasSearched(true);
    setSelectedResult(null);

    try {
      const res = await fetch("/api/documentos/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en la búsqueda");
      }

      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploadStatus("uploading");
    setUploadMessage(`Procesando ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al subir archivo");
      }

      setUploadStatus("success");
      setUploadMessage(
        `${file.name} procesado: ${data.chunks_count} fragmentos indexados`
      );
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage(
        err instanceof Error ? err.message : "Error al procesar archivo"
      );
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  function similarityColor(s: number) {
    if (s >= 0.7) return "text-brand bg-brand-light";
    if (s >= 0.5) return "text-amber-700 bg-amber-50";
    return "text-text-muted bg-stone-100";
  }

  function similarityPercent(s: number) {
    return Math.round(s * 100);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Jurisprudencia
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Sube documentos legales y busca con IA
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowUpload(!showUpload);
              setUploadStatus("idle");
              setUploadMessage("");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors"
          >
            <Upload size={16} />
            Subir documento
          </button>
          <Link
            href="/casos?nuevo=1"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]"
          >
            <Plus size={16} />
            Nuevo caso
          </Link>
        </div>
      </div>

      {showUpload && (
        <div className="mb-8 animate-fade-in">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? "border-brand bg-brand-light/30"
                : "border-border bg-stone-50"
            }`}
          >
            {uploadStatus === "idle" && (
              <>
                <Upload
                  size={32}
                  className="text-text-muted mx-auto mb-3"
                />
                <p className="text-sm text-text-secondary mb-1">
                  Arrastra un archivo PDF o TXT aquí
                </p>
                <p className="text-xs text-text-muted mb-4">
                  El documento se procesará y se indexará para búsqueda
                  semántica
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
                >
                  <FileText size={14} />
                  Seleccionar archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </>
            )}

            {uploadStatus === "uploading" && (
              <div className="flex items-center justify-center gap-3">
                <Loader2 size={20} className="text-brand animate-spin" />
                <p className="text-sm text-text-secondary">{uploadMessage}</p>
              </div>
            )}

            {uploadStatus === "success" && (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <p className="text-sm text-green-700">{uploadMessage}</p>
                <button
                  onClick={() => {
                    setUploadStatus("idle");
                    setUploadMessage("");
                  }}
                  className="text-xs text-text-muted underline ml-2"
                >
                  Subir otro
                </button>
              </div>
            )}

            {uploadStatus === "error" && (
              <div className="flex items-center justify-center gap-3">
                <AlertCircle size={20} className="text-red-600" />
                <p className="text-sm text-red-700">{uploadMessage}</p>
                <button
                  onClick={() => {
                    setUploadStatus("idle");
                    setUploadMessage("");
                  }}
                  className="text-xs text-text-muted underline ml-2"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowUpload(false)}
            className="mt-2 text-xs text-text-muted hover:text-text-secondary"
          >
            Cerrar
          </button>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-8 animate-fade-in animate-fade-in-delay-1">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tema, artículo o concepto jurídico..."
            className="w-full pl-11 pr-36 py-3.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {searching ? "Buscando..." : "Buscar con IA"}
          </button>
        </div>
        {hasSearched && (
          <p className="text-xs text-text-muted mt-2">
            {results.length} resultados encontrados &middot; Ordenados por
            relevancia semántica
          </p>
        )}
      </form>

      {!hasSearched && results.length === 0 && (
        <div className="text-center py-16 animate-fade-in animate-fade-in-delay-2">
          <BookOpen size={48} className="text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Busca en tus documentos legales
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
            Sube tus archivos de jurisprudencias y tesis, luego búscalas usando
            lenguaje natural. El sistema encuentra los fragmentos más relevantes
            usando búsqueda semántica.
          </p>
          <div className="flex justify-center gap-6 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <Upload size={14} />
              <span>1. Sube documentos</span>
            </div>
            <div className="flex items-center gap-2">
              <Search size={14} />
              <span>2. Escribe tu búsqueda</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} />
              <span>3. Obtén resultados relevantes</span>
            </div>
          </div>
        </div>
      )}

      {hasSearched && results.length === 0 && !searching && (
        <div className="text-center py-16">
          <Search size={48} className="text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Sin resultados
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            No se encontraron fragmentos relevantes. Intenta con otros términos
            o sube más documentos.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-5 gap-6 animate-fade-in">
          <div className="col-span-3 space-y-3">
            {results.map((r) => (
              <button
                key={`${r.source_filename}-${r.chunk_index}`}
                onClick={() => setSelectedResult(r)}
                className={`w-full text-left bg-white rounded-xl border p-5 hover:shadow-sm transition-all ${
                  selectedResult?.id === r.id
                    ? "border-brand shadow-sm"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <FileText size={12} />
                    <span className="truncate max-w-xs">
                      {r.source_filename}
                    </span>
                    <span>&middot;</span>
                    <span>Fragmento {r.chunk_index + 1}</span>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold tabular-nums ${similarityColor(
                      r.similarity
                    )}`}
                  >
                    {similarityPercent(r.similarity)}%
                  </span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed line-clamp-4">
                  {r.content}
                </p>
              </button>
            ))}
          </div>

          <div className="col-span-2">
            {selectedResult ? (
              <div className="bg-white rounded-xl border border-border p-6 sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-brand" />
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                      Detalle del fragmento
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="text-text-muted hover:text-text-secondary"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                      Archivo fuente
                    </p>
                    <p className="text-sm font-mono text-text-primary">
                      {selectedResult.source_filename}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                      Relevancia
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all"
                          style={{
                            width: `${similarityPercent(selectedResult.similarity)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-brand tabular-nums">
                        {similarityPercent(selectedResult.similarity)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                      Contenido
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                      {selectedResult.content}
                    </p>
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
                  Selecciona un resultado para ver el fragmento completo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
