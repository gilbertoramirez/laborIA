"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Upload,
  Sparkles,
  Loader2,
  FileAudio,
  AlertCircle,
  Users,
  Shield,
  Scale,
  FileText,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface Participante {
  rol: string;
  nombre: string | null;
}

interface Admision {
  quien: string;
  hecho: string;
}

interface Objecion {
  descripcion: string;
}

interface Prueba {
  tipo: string;
  descripcion: string;
  estado: string;
}

interface EstrategiaItem {
  titulo: string;
  detalle: string;
  relevancia: "alta" | "media" | "baja";
}

interface Analysis {
  participantes: Participante[];
  hechos_clave: string[];
  admisiones: Admision[];
  objeciones: Objecion[];
  pruebas: Prueba[];
  estrategia: EstrategiaItem[];
  resumen: string;
  recomendaciones: string[];
}

type Step = "upload" | "transcribing" | "transcribed" | "analyzing" | "done";
type Tab = "transcripcion" | "estrategia" | "resumen";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function relevanciaStyle(r: string) {
  switch (r) {
    case "alta":
      return "bg-brand-light text-brand";
    case "media":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-stone-100 text-text-muted";
  }
}

function estadoStyle(e: string) {
  switch (e) {
    case "admitida":
      return "bg-green-50 text-green-700";
    case "desechada":
      return "bg-red-50 text-red-700";
    case "objetada":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-stone-100 text-text-secondary";
  }
}

export default function Audiencias() {
  const [step, setStep] = useState<Step>("upload");
  const [tab, setTab] = useState<Tab>("transcripcion");
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [duration, setDuration] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setError("");
    setFilename(file.name);
    setStep("transcribing");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/audiencias/transcribir", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "Error en la transcripción";
        try { msg = JSON.parse(text).error || msg; } catch { /* */ }
        throw new Error(msg);
      }

      const data = await res.json();
      setTranscriptionText(data.text);
      setSegments(data.segments || []);
      setDuration(data.duration || 0);
      setStep("transcribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al transcribir");
      setStep("upload");
    }
  }

  async function handleAnalyze() {
    if (!transcriptionText) return;
    setStep("analyzing");
    setError("");

    try {
      const res = await fetch("/api/audiencias/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: transcriptionText }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "Error en el análisis";
        try { msg = JSON.parse(text).error || msg; } catch { /* */ }
        throw new Error(msg);
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setTab("estrategia");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar");
      setStep("transcribed");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleReset() {
    setStep("upload");
    setFilename("");
    setTranscriptionText("");
    setSegments([]);
    setAnalysis(null);
    setError("");
    setDuration(0);
    setTab("transcripcion");
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Audiencias
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Sube el audio de una audiencia, transcríbelo y extrae estrategia con IA
          </p>
        </div>
        <div className="flex gap-3">
          {step !== "upload" && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors"
            >
              <Upload size={16} />
              Nueva audiencia
            </button>
          )}
          <Link
            href="/casos?nuevo=1"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]"
          >
            <Plus size={16} />
            Nuevo caso
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl mb-6 animate-fade-in">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="animate-fade-in">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${
              dragOver ? "border-brand bg-brand-light" : "border-border"
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-5">
              <FileAudio size={28} className="text-brand" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Sube el audio de la audiencia
            </h2>
            <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
              Arrastra un archivo de audio aquí o haz clic para seleccionarlo.
              Soporta MP3, WAV, M4A, WebM y OGG (máx. 25MB).
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]"
            >
              <Upload size={16} />
              Seleccionar archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.webm,.ogg,.mp4,audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Steps explanation */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            {[
              { icon: Upload, title: "1. Sube el audio", desc: "Graba o sube el audio de la audiencia laboral" },
              { icon: FileText, title: "2. Transcripción automática", desc: "IA transcribe el audio completo con timestamps" },
              { icon: Sparkles, title: "3. Estrategia con IA", desc: "Extrae admisiones, objeciones, pruebas y recomendaciones" },
            ].map((s) => (
              <div key={s.title} className="flex items-start gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                  <s.icon size={18} className="text-text-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{s.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step: Transcribing */}
      {step === "transcribing" && (
        <div className="text-center py-20 animate-fade-in">
          <Loader2 size={48} className="animate-spin text-brand mx-auto mb-5" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Transcribiendo audio...
          </h2>
          <p className="text-sm text-text-muted mb-1">{filename}</p>
          <p className="text-xs text-text-muted">
            Esto puede tomar unos segundos dependiendo de la duración
          </p>
        </div>
      )}

      {/* Step: Analyzing */}
      {step === "analyzing" && (
        <div className="text-center py-20 animate-fade-in">
          <Sparkles size={48} className="text-brand mx-auto mb-5 animate-pulse" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Analizando audiencia...
          </h2>
          <p className="text-sm text-text-muted">
            Extrayendo estrategia, admisiones, objeciones y recomendaciones
          </p>
        </div>
      )}

      {/* Steps: Transcribed or Done */}
      {(step === "transcribed" || step === "done") && (
        <div className="animate-fade-in">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-border p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center">
                  <FileAudio size={18} className="text-brand" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    {filename}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {duration > 0 && `${formatTime(duration)} · `}
                    {segments.length} segmentos
                    {analysis && " · Análisis completo"}
                  </p>
                </div>
              </div>
              {!analysis && (
                <button
                  onClick={handleAnalyze}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]"
                >
                  <Sparkles size={15} />
                  Extraer estrategia
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border">
            {(
              [
                ["transcripcion", "Transcripción"],
                ["estrategia", `Estrategia${analysis ? ` (${analysis.estrategia.length})` : ""}`],
                ["resumen", "Resumen"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                disabled={key !== "transcripcion" && !analysis}
                className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px disabled:opacity-30 disabled:cursor-not-allowed ${
                  tab === key
                    ? "border-brand text-brand font-medium"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Transcripción */}
          {tab === "transcripcion" && (
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              {segments.length > 0 ? (
                segments.map((s, i) => (
                  <div key={i} className="flex gap-4 px-5 py-3 hover:bg-stone-50/50 transition-colors">
                    <span className="text-xs font-mono text-text-muted w-14 shrink-0 pt-0.5 text-right tabular-nums">
                      {formatTime(s.start)}
                    </span>
                    <p className="text-sm text-text-primary leading-relaxed flex-1">
                      {s.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6">
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {transcriptionText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Estrategia */}
          {tab === "estrategia" && analysis && (
            <div className="grid grid-cols-5 gap-6">
              {/* Left: Key findings */}
              <div className="col-span-2 space-y-5">
                {/* Participantes */}
                {analysis.participantes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={14} className="text-text-muted" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Participantes
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {analysis.participantes.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-border">
                          <span className="text-xs font-semibold text-text-secondary uppercase">{p.rol}</span>
                          {p.nombre && (
                            <span className="text-xs text-text-muted">{p.nombre}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admisiones */}
                {analysis.admisiones.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={14} className="text-brand" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Admisiones ({analysis.admisiones.length})
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {analysis.admisiones.map((a, i) => (
                        <div key={i} className="p-3 bg-brand-light rounded-lg border border-brand/20">
                          <p className="text-xs font-semibold text-brand mb-0.5">{a.quien}</p>
                          <p className="text-xs text-text-secondary">{a.hecho}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objeciones */}
                {analysis.objeciones.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={14} className="text-amber-600" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Objeciones ({analysis.objeciones.length})
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {analysis.objeciones.map((o, i) => (
                        <div key={i} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-xs text-amber-800">{o.descripcion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pruebas */}
                {analysis.pruebas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Scale size={14} className="text-text-muted" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Pruebas ({analysis.pruebas.length})
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {analysis.pruebas.map((p, i) => (
                        <div key={i} className="p-3 bg-white rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-text-secondary">{p.tipo}</span>
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${estadoStyle(p.estado)}`}>
                              {p.estado}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted">{p.descripcion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Strategy insights */}
              <div className="col-span-3 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                  Insights estratégicos
                </h3>
                {analysis.estrategia.map((e, i) => (
                  <div key={i} className="bg-white rounded-xl border border-border p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-text-primary">{e.titulo}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${relevanciaStyle(e.relevancia)}`}>
                        {e.relevancia}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{e.detalle}</p>
                  </div>
                ))}

                {/* Recomendaciones */}
                {analysis.recomendaciones.length > 0 && (
                  <div className="bg-brand-light rounded-xl border border-brand/20 p-5 mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-brand mb-3">
                      Recomendaciones
                    </h4>
                    <div className="space-y-2">
                      {analysis.recomendaciones.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight size={14} className="text-brand shrink-0 mt-0.5" />
                          <p className="text-sm text-text-primary">{r}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Resumen */}
          {tab === "resumen" && analysis && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-xl border border-border p-6 mb-6">
                <h4 className="font-display text-lg text-text-primary mb-3">
                  Resumen de la audiencia
                </h4>
                <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {analysis.resumen}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Participantes", value: analysis.participantes.length, icon: Users },
                  { label: "Admisiones", value: analysis.admisiones.length, icon: CheckCircle2 },
                  { label: "Objeciones", value: analysis.objeciones.length, icon: AlertCircle },
                  { label: "Pruebas", value: analysis.pruebas.length, icon: Scale },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-border p-4 text-center">
                    <stat.icon size={18} className="text-text-muted mx-auto mb-2" />
                    <p className="text-2xl font-display text-text-primary">{stat.value}</p>
                    <p className="text-xs text-text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Hechos clave */}
              {analysis.hechos_clave.length > 0 && (
                <div className="mt-6 bg-white rounded-xl border border-border p-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                    Hechos clave
                  </h4>
                  <div className="space-y-2">
                    {analysis.hechos_clave.map((h, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs font-mono text-text-muted w-5 text-right shrink-0 pt-0.5">{i + 1}</span>
                        <p className="text-sm text-text-secondary">{h}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
