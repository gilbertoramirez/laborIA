"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  FileText,
  FileCheck,
  Handshake,
  ScrollText,
  Upload,
  MessageSquare,
  Send,
  Loader2,
  File as FileIcon,
  AlertCircle,
  Bot,
  User,
  FileUp,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

type DocTab = "plantillas" | "documentos";

interface UploadedDoc {
  filename: string;
  storage_path: string;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { filename: string; similarity: number; excerpt?: string }[];
}

const plantillas = [
  { id: "demanda", label: "Demanda laboral", icon: FileText, active: true },
  { id: "contestacion", label: "Contestación", icon: FileCheck },
  { id: "contrato", label: "Contrato individual", icon: ScrollText },
  { id: "convenio", label: "Convenio", icon: Handshake },
];

export default function Documentos() {
  const [docTab, setDocTab] = useState<DocTab>("documentos");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Documentos
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Sube documentos, haz preguntas con IA, y genera escritos
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
          onClick={() => setDocTab("documentos")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            docTab === "documentos"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <MessageSquare size={16} />
          Mis documentos + Chat IA
        </button>
        <button
          onClick={() => setDocTab("plantillas")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            docTab === "plantillas"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <FileText size={16} />
          Plantillas
        </button>
      </div>

      {docTab === "documentos" ? <DocumentosChat /> : <PlantillasTab />}
    </div>
  );
}

function DocumentosChat() {
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/documentos/list");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "Error al subir";
        try { msg = JSON.parse(text).error || msg; } catch { /* not JSON */ }
        throw new Error(msg);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Documento "${data.filename}" subido e indexado correctamente (${data.chunks_count} fragmentos). Ya puedes hacerme preguntas sobre su contenido.`,
        },
      ]);
      loadDocs();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al subir archivo"
      );
    } finally {
      setUploading(false);
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

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || sending) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setSending(true);

    try {
      const res = await fetch("/api/documentos/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: messages.slice(-6),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "Error al procesar";
        try { msg = JSON.parse(text).error || msg; } catch { /* not JSON */ }
        throw new Error(msg);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);

      if (data.loading) {
        setTimeout(async () => {
          setSending(true);
          try {
            const retryRes = await fetch("/api/documentos/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question, history: messages.slice(-6) }),
            });
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              if (!retryData.loading) {
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  {
                    role: "assistant",
                    content: retryData.answer,
                    sources: retryData.sources,
                  },
                ]);
              }
            }
          } catch {
            /* ignore retry */
          } finally {
            setSending(false);
          }
        }, 20000);
        return;
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "No se pudo generar respuesta"}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in animate-fade-in-delay-1">
      {/* Sidebar: uploaded docs */}
      <div className="col-span-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Documentos subidos
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-brand hover:bg-brand-light rounded transition-colors"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            Subir
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg mb-3 text-xs text-red-700">
            <AlertCircle size={14} />
            {uploadError}
          </div>
        )}

        {loadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : docs.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragOver
                ? "border-brand bg-brand-light"
                : "border-border"
            }`}
          >
            <FileUp
              size={32}
              className="mx-auto mb-3 text-text-muted"
            />
            <p className="text-sm text-text-muted mb-2">
              Arrastra un PDF o TXT aquí
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-brand hover:underline"
            >
              o haz clic para seleccionar
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {docs.map((doc) => (
              <div
                key={doc.filename + doc.created_at}
                className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg border border-border hover:shadow-sm transition-all"
              >
                <FileIcon size={16} className="text-brand shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {doc.filename}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {new Date(doc.created_at).toLocaleDateString("es-MX")}
                  </p>
                </div>
              </div>
            ))}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-3 text-center text-xs text-text-muted mt-3 transition-colors cursor-pointer hover:border-brand/40 ${
                dragOver ? "border-brand bg-brand-light" : "border-border"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} className="mx-auto mb-1" />
              Subir otro documento
            </div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="col-span-9">
        <div className="bg-white rounded-xl border border-border flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot size={48} className="text-text-muted mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Chat con tus documentos
                </h3>
                <p className="text-sm text-text-muted max-w-md mb-6">
                  Sube un PDF o archivo de texto y hazme preguntas sobre su
                  contenido. Uso IA para buscar en los documentos y darte
                  respuestas precisas.
                </p>
                <div className="flex gap-4 text-xs text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Upload size={14} />
                    <span>1. Sube documentos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Search size={14} />
                    <span>2. Pregunta lo que quieras</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bot size={14} />
                    <span>3. Recibe respuestas con fuentes</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-brand" />
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-brand text-white"
                      : "bg-stone-50 text-text-primary border border-border"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
                        Fuentes
                      </p>
                      <div className="space-y-1">
                        {msg.sources.map((s, j) => (
                          <div
                            key={j}
                            className="flex items-center gap-2 text-xs text-text-secondary"
                          >
                            <BookOpen size={10} className="shrink-0" />
                            <span className="truncate">{s.filename}</span>
                            <span className="text-text-muted shrink-0">
                              {Math.round(s.similarity * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-brand" />
                </div>
                <div className="bg-stone-50 border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Loader2 size={14} className="animate-spin" />
                    Analizando documentos...
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="border-t border-border p-4 flex gap-3"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 p-2.5 text-text-muted hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
              title="Subir documento"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                docs.length === 0
                  ? "Sube un documento primero..."
                  : "Pregunta sobre tus documentos..."
              }
              disabled={sending}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="shrink-0 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PlantillasTab() {
  const [plantilla, setPlantilla] = useState("demanda");
  const [parteActora, setParteActora] = useState("José López Herrera");
  const [parteDemandada, setParteDemandada] = useState(
    "Grupo Ferro, S.A. de C.V."
  );
  const [puesto, setPuesto] = useState("Operador de línea");
  const [salario, setSalario] = useState("450.00");
  const [fechaIngreso, setFechaIngreso] = useState("2019-03-01");
  const [fechaDespido, setFechaDespido] = useState("2026-06-30");

  function formatDateES(d: string) {
    if (!d) return "";
    return d;
  }

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in animate-fade-in-delay-1">
      {/* Templates sidebar */}
      <div className="col-span-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
          Plantillas
        </h2>
        <div className="space-y-1">
          {plantillas.map((p) => {
            const Icon = p.icon;
            const isActive = plantilla === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPlantilla(p.id)}
                className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-brand-light text-brand font-medium"
                    : "text-text-secondary hover:bg-stone-50"
                }`}
              >
                <Icon size={16} />
                <span className="text-sm">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Variables form */}
      <div className="col-span-4">
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Variables dinámicas
            </h2>
            <span className="text-xs text-text-muted px-2 py-0.5 bg-stone-100 rounded">
              Demanda laboral
            </span>
          </div>

          <div className="space-y-4">
            {[
              {
                label: "Parte actora",
                value: parteActora,
                set: setParteActora,
              },
              {
                label: "Parte demandada",
                value: parteDemandada,
                set: setParteDemandada,
              },
              { label: "Puesto", value: puesto, set: setPuesto },
              {
                label: "Salario diario",
                value: salario,
                set: setSalario,
                prefix: "$",
              },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-sm text-text-secondary mb-1.5">
                  {f.label}
                </label>
                <div className="relative">
                  {f.prefix && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                      {f.prefix}
                    </span>
                  )}
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className={`w-full py-2.5 border border-border rounded-lg text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors ${
                      f.prefix ? "pl-8 pr-3.5" : "px-3.5"
                    }`}
                  />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Fecha de ingreso
                </label>
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Fecha de despido
                </label>
                <input
                  type="date"
                  value={fechaDespido}
                  onChange={(e) => setFechaDespido(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                />
              </div>
            </div>

            <button className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-dark to-brand text-white rounded-lg text-sm font-medium hover:from-brand hover:to-brand-dark transition-all active:scale-[0.98] shadow-lg shadow-brand/20">
              <FileText size={16} />
              Generar documento
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="col-span-5">
        <div className="bg-white rounded-xl border border-border p-8 shadow-sm min-h-[600px]">
          <div className="max-w-md mx-auto text-justify leading-relaxed">
            <p className="text-center font-bold text-sm mb-1 tracking-wider">
              C. JUEZ DEL TRIBUNAL LABORAL FEDERAL
            </p>
            <p className="text-center font-bold text-sm mb-6 tracking-wider">
              EN TURNO. PRESENTE.
            </p>

            <p className="text-sm mb-4">
              <span className="font-semibold underline decoration-brand/30 decoration-2 underline-offset-2">
                {parteActora || "___________"}
              </span>
              , por mi propio derecho, señalando domicilio para oír y recibir
              notificaciones en esta ciudad, ante Usted con el debido respeto
              comparezco para exponer:
            </p>

            <p className="text-sm mb-6">
              Que vengo a demandar de{" "}
              <span className="font-semibold underline decoration-brand/30 decoration-2 underline-offset-2">
                {parteDemandada || "___________"}
              </span>{" "}
              el pago y cumplimiento de las prestaciones que más adelante se
              detallan, con motivo del{" "}
              <strong>despido injustificado</strong> del que fui objeto.
            </p>

            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-3">
              Hechos
            </p>

            <p className="text-sm mb-3">
              <strong>1.</strong> El suscrito ingresó a laborar para la
              demandada con fecha{" "}
              <span className="font-semibold underline decoration-brand/30 decoration-2 underline-offset-2">
                {formatDateES(fechaIngreso)}
              </span>
              , desempeñando el puesto de{" "}
              <span className="font-semibold underline decoration-brand/30 decoration-2 underline-offset-2">
                {puesto || "___________"}
              </span>
              , percibiendo un salario diario de{" "}
              <span className="font-semibold underline decoration-brand/30 decoration-2 underline-offset-2">
                ${salario || "___________"}
              </span>
              .
            </p>

            <p className="text-sm mb-6">
              <strong>2.</strong> Con fecha{" "}
              <span className="font-semibold underline decoration-brand/30 decoration-2 underline-offset-2">
                {formatDateES(fechaDespido)}
              </span>{" "}
              fui despedido de manera injustificada, sin que mediara causa
              alguna de las previstas en el artículo 47 de la Ley Federal del
              Trabajo.
            </p>

            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-3">
              Prestaciones
            </p>

            <p className="text-sm">
              <strong>a)</strong> Indemnización constitucional de tres meses de
              salario. <strong>b)</strong> Salarios caídos.{" "}
              <strong>c)</strong> Prima de antigüedad. <strong>d)</strong>{" "}
              Aguinaldo y vacaciones proporcionales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
