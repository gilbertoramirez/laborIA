"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
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
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";

type DocTab = "plantillas" | "documentos";

interface UploadedDoc {
  filename: string;
  storage_path: string;
  created_at: string;
}

interface ChatSource {
  filename: string;
  excerpt?: string;
  chunkIndex?: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

const plantillas = [
  { id: "demanda", label: "Demanda laboral", icon: FileText, active: true },
  { id: "contestacion", label: "Contestación", icon: FileCheck },
  { id: "contrato", label: "Contrato individual", icon: ScrollText },
  { id: "convenio", label: "Convenio", icon: Handshake },
];

const suggestedQuestions = [
  "¿De qué trata este documento?",
  "¿Cuáles son los puntos clave?",
  "Resume las conclusiones principales",
  "¿Qué artículos de ley se mencionan?",
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
          Chat con documentos
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleSend(e?: React.FormEvent, questionOverride?: string) {
    e?.preventDefault();
    const question = questionOverride || input.trim();
    if (!question || sending) return;

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
      inputRef.current?.focus();
    }
  }

  const hasDocuments = docs.length > 0;

  return (
    <div className="animate-fade-in animate-fade-in-delay-1">
      <div className="bg-white rounded-xl border border-border flex flex-col h-[calc(100vh-260px)] min-h-[500px]">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-stone-50 rounded-lg transition-colors"
            title={sidebarOpen ? "Ocultar documentos" : "Mostrar documentos"}
          >
            <FileIcon size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-text-primary">
              Chat con documentos
            </h2>
            <p className="text-[10px] text-text-muted">
              {hasDocuments
                ? `${docs.length} documento${docs.length !== 1 ? "s" : ""} cargado${docs.length !== 1 ? "s" : ""}`
                : "Sube un documento para comenzar"}
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand bg-brand-light hover:bg-brand/10 rounded-lg transition-colors font-medium"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            {uploading ? "Subiendo..." : "Subir PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: uploaded docs */}
          {sidebarOpen && (
            <div className="w-56 border-r border-border flex flex-col shrink-0">
              <div className="p-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Documentos
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-0.5 text-text-muted hover:text-text-secondary"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {uploadError && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg mb-2 text-xs text-red-700">
                    <AlertCircle size={12} />
                    <span className="truncate">{uploadError}</span>
                  </div>
                )}

                {loadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={16} className="animate-spin text-text-muted" />
                  </div>
                ) : docs.length === 0 ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      dragOver ? "border-brand bg-brand-light" : "border-border"
                    }`}
                  >
                    <FileUp size={24} className="mx-auto mb-2 text-text-muted" />
                    <p className="text-xs text-text-muted mb-1">
                      Arrastra un archivo
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] text-brand hover:underline"
                    >
                      o selecciona uno
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {docs.map((doc) => (
                      <div
                        key={doc.filename + doc.created_at}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-stone-50 transition-colors group"
                      >
                        <FileIcon size={14} className="text-brand shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-primary truncate">
                            {doc.filename}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {new Date(doc.created_at).toLocaleDateString("es-MX")}
                          </p>
                        </div>
                      </div>
                    ))}

                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border border-dashed rounded-lg p-2 text-center text-[10px] text-text-muted mt-2 transition-colors cursor-pointer hover:border-brand/40 ${
                        dragOver ? "border-brand bg-brand-light" : "border-border"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={12} className="mx-auto mb-0.5" />
                      Subir más
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-5"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {!hasDocuments ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-5">
                        <FileUp size={28} className="text-brand" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Sube un documento para comenzar
                      </h3>
                      <p className="text-sm text-text-muted max-w-sm mb-6">
                        Arrastra un PDF aquí o usa el botón &quot;Subir PDF&quot;.
                        Después podrás chatear con el contenido del documento.
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
                      >
                        <Upload size={16} />
                        Subir documento
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-5">
                        <Bot size={28} className="text-brand" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Pregunta sobre tus documentos
                      </h3>
                      <p className="text-sm text-text-muted max-w-sm mb-6">
                        Tengo {docs.length} documento{docs.length !== 1 ? "s" : ""} listo{docs.length !== 1 ? "s" : ""}.
                        Hazme cualquier pregunta sobre su contenido.
                      </p>
                      <div className="grid grid-cols-2 gap-2 max-w-md">
                        {suggestedQuestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => handleSend(undefined, q)}
                            className="text-left px-3 py-2.5 text-xs text-text-secondary bg-stone-50 hover:bg-stone-100 border border-border rounded-lg transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
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
                    <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-brand" />
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] ${
                      msg.role === "user"
                        ? "bg-brand text-white rounded-2xl rounded-br-md px-4 py-3"
                        : "space-y-2"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <>
                        <div className="bg-stone-50 border border-border rounded-2xl rounded-bl-md px-4 py-3">
                          <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>

                        {msg.sources && msg.sources.length > 0 && (
                          <SourcesCollapsible sources={msg.sources} />
                        )}
                      </>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} className="text-white" />
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-brand" />
                  </div>
                  <div className="bg-stone-50 border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <Loader2 size={14} className="animate-spin" />
                      Analizando documentos...
                    </div>
                  </div>
                </div>
              )}

              {dragOver && (
                <div className="absolute inset-0 bg-brand/5 border-2 border-dashed border-brand rounded-xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <Upload size={32} className="text-brand mx-auto mb-2" />
                    <p className="text-sm font-medium text-brand">Suelta para subir</p>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="border-t border-border p-3 flex gap-2"
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
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  !hasDocuments
                    ? "Sube un documento primero..."
                    : "Pregunta sobre tus documentos..."
                }
                disabled={sending}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="shrink-0 p-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourcesCollapsible({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ml-0.5">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <BookOpen size={11} />
        {sources.length} fuente{sources.length !== 1 ? "s" : ""}
      </button>

      {open && (
        <div className="mt-1.5 ml-1 space-y-1.5">
          {sources.map((s, j) => (
            <div
              key={j}
              className="bg-stone-50 border border-border rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileIcon size={11} className="text-brand shrink-0" />
                <span className="text-xs font-medium text-text-primary truncate">
                  {s.filename}
                </span>
              </div>
              {s.excerpt && (
                <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                  {s.excerpt}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
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
