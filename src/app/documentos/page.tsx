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
  Download,
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
  const [deleting, setDeleting] = useState<string | null>(null);

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

  async function handleDelete(filename: string) {
    if (deleting) return;
    setDeleting(filename);
    try {
      const res = await fetch("/api/documentos/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.filename !== filename));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Documento "${filename}" eliminado. Ya no será usado como contexto.`,
          },
        ]);
      }
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  }

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
                        <button
                          onClick={() => handleDelete(doc.filename)}
                          disabled={deleting === doc.filename}
                          className="shrink-0 p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                          title="Eliminar documento"
                        >
                          {deleting === doc.filename ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                        </button>
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

interface PlantillaField {
  key: string;
  label: string;
  type?: "text" | "date" | "select";
  prefix?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  colSpan?: 1 | 2;
}

interface PlantillaConfig {
  id: string;
  label: string;
  icon: typeof FileText;
  fields: PlantillaField[];
  defaults: Record<string, string>;
}

const plantillaConfigs: PlantillaConfig[] = [
  {
    id: "demanda",
    label: "Demanda laboral",
    icon: FileText,
    fields: [
      { key: "parteActora", label: "Parte actora", placeholder: "Nombre del trabajador" },
      { key: "parteDemandada", label: "Parte demandada", placeholder: "Nombre del patrón o empresa" },
      { key: "puesto", label: "Puesto", placeholder: "Puesto desempeñado" },
      { key: "salario", label: "Salario diario", prefix: "$", placeholder: "0.00" },
      { key: "fechaIngreso", label: "Fecha de ingreso", type: "date" },
      { key: "fechaDespido", label: "Fecha de despido", type: "date" },
    ],
    defaults: {
      parteActora: "José López Herrera",
      parteDemandada: "Grupo Ferro, S.A. de C.V.",
      puesto: "Operador de línea",
      salario: "450.00",
      fechaIngreso: "2019-03-01",
      fechaDespido: "2026-06-30",
    },
  },
  {
    id: "contestacion",
    label: "Contestación",
    icon: FileCheck,
    fields: [
      { key: "parteDemandada", label: "Parte demandada (empresa)", placeholder: "Nombre de la empresa" },
      { key: "representanteLegal", label: "Representante legal", placeholder: "Nombre del representante" },
      { key: "parteActora", label: "Parte actora (trabajador)", placeholder: "Nombre del trabajador" },
      { key: "expediente", label: "Número de expediente", placeholder: "Ej: 123/2026" },
      { key: "fechaContestacion", label: "Fecha de contestación", type: "date" },
    ],
    defaults: {
      parteDemandada: "Grupo Ferro, S.A. de C.V.",
      representanteLegal: "Lic. María García Ruiz",
      parteActora: "José López Herrera",
      expediente: "123/2026",
      fechaContestacion: new Date().toISOString().slice(0, 10),
    },
  },
  {
    id: "contrato",
    label: "Contrato individual",
    icon: ScrollText,
    fields: [
      { key: "nombrePatron", label: "Nombre del patrón", placeholder: "Persona física o moral" },
      { key: "nombreTrabajador", label: "Nombre del trabajador", placeholder: "Nombre completo" },
      { key: "puesto", label: "Puesto", placeholder: "Puesto a desempeñar" },
      { key: "salario", label: "Salario diario", prefix: "$", placeholder: "0.00" },
      { key: "fechaInicio", label: "Fecha de inicio", type: "date" },
      { key: "duracion", label: "Duración", type: "select", options: [
        { value: "indefinido", label: "Tiempo indefinido" },
        { value: "temporal", label: "Obra o tiempo determinado" },
        { value: "prueba", label: "Período de prueba (30 días)" },
      ]},
      { key: "horario", label: "Horario", placeholder: "Ej: Lunes a Viernes 9:00 - 18:00" },
      { key: "direccionTrabajo", label: "Dirección del centro de trabajo", placeholder: "Dirección completa" },
    ],
    defaults: {
      nombrePatron: "Grupo Ferro, S.A. de C.V.",
      nombreTrabajador: "José López Herrera",
      puesto: "Operador de línea",
      salario: "450.00",
      fechaInicio: new Date().toISOString().slice(0, 10),
      duracion: "indefinido",
      horario: "Lunes a Viernes de 9:00 a 18:00 hrs",
      direccionTrabajo: "Av. Industria #100, Col. Centro, CDMX",
    },
  },
  {
    id: "convenio",
    label: "Convenio",
    icon: Handshake,
    fields: [
      { key: "nombreTrabajador", label: "Nombre del trabajador", placeholder: "Nombre completo" },
      { key: "nombrePatron", label: "Nombre del patrón", placeholder: "Persona física o moral" },
      { key: "puesto", label: "Puesto", placeholder: "Puesto desempeñado" },
      { key: "salario", label: "Salario diario", prefix: "$", placeholder: "0.00" },
      { key: "fechaIngreso", label: "Fecha de ingreso", type: "date" },
      { key: "fechaTerminacion", label: "Fecha de terminación", type: "date" },
      { key: "liquidacionTotal", label: "Monto total de liquidación", prefix: "$", placeholder: "0.00" },
    ],
    defaults: {
      nombreTrabajador: "José López Herrera",
      nombrePatron: "Grupo Ferro, S.A. de C.V.",
      puesto: "Operador de línea",
      salario: "450.00",
      fechaIngreso: "2019-03-01",
      fechaTerminacion: new Date().toISOString().slice(0, 10),
      liquidacionTotal: "85,000.00",
    },
  },
];

function formatDateES(d: string): string {
  if (!d) return "___________";
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${parseInt(day)} de ${months[parseInt(m) - 1]} de ${y}`;
}

function hl(val: string | undefined) {
  return val || "___________";
}

function PlantillasTab() {
  const [plantillaId, setPlantillaId] = useState("demanda");
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    for (const cfg of plantillaConfigs) {
      initial[cfg.id] = { ...cfg.defaults };
    }
    return initial;
  });
  const [generating, setGenerating] = useState(false);

  const config = plantillaConfigs.find((c) => c.id === plantillaId)!;
  const data = formData[plantillaId];

  function updateField(key: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [plantillaId]: { ...prev[plantillaId], [key]: value },
    }));
  }

  async function handleDownload() {
    setGenerating(true);
    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = await import("docx");
      const { saveAs } = await import("file-saver");

      const paragraphs = buildDocxParagraphs(plantillaId, data, { Document, Paragraph, TextRun, AlignmentType, HeadingLevel });

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            },
          },
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${config.label.replace(/\s+/g, "_")}.docx`);
    } catch (err) {
      console.error("Error generating docx:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in animate-fade-in-delay-1">
      {/* Templates sidebar */}
      <div className="col-span-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
          Plantillas
        </h2>
        <div className="space-y-1">
          {plantillaConfigs.map((p) => {
            const Icon = p.icon;
            const isActive = plantillaId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPlantillaId(p.id)}
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
              {config.label}
            </span>
          </div>

          <div className="space-y-4">
            {config.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-text-secondary mb-1.5">
                  {f.label}
                </label>
                {f.type === "select" ? (
                  <select
                    value={data[f.key] || ""}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                  >
                    {f.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : f.type === "date" ? (
                  <input
                    type="date"
                    value={data[f.key] || ""}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                  />
                ) : (
                  <div className="relative">
                    {f.prefix && (
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                        {f.prefix}
                      </span>
                    )}
                    <input
                      type="text"
                      value={data[f.key] || ""}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full py-2.5 border border-border rounded-lg text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors ${
                        f.prefix ? "pl-8 pr-3.5" : "px-3.5"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={handleDownload}
              disabled={generating}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-dark to-brand text-white rounded-lg text-sm font-medium hover:from-brand hover:to-brand-dark transition-all active:scale-[0.98] shadow-lg shadow-brand/20 disabled:opacity-60"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {generating ? "Generando..." : "Descargar documento (.docx)"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="col-span-5">
        <div className="bg-white rounded-xl border border-border p-8 shadow-sm min-h-[600px]">
          <div className="max-w-md mx-auto text-justify leading-relaxed">
            {plantillaId === "demanda" && <PreviewDemanda data={data} />}
            {plantillaId === "contestacion" && <PreviewContestacion data={data} />}
            {plantillaId === "contrato" && <PreviewContrato data={data} />}
            {plantillaId === "convenio" && <PreviewConvenio data={data} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hl({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold underline decoration-brand/30 decoration-2 underline-offset-2">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-bold text-xs uppercase tracking-[0.2em] mb-3 mt-6">{children}</p>
  );
}

function PreviewDemanda({ data }: { data: Record<string, string> }) {
  return (
    <>
      <p className="text-center font-bold text-sm mb-1 tracking-wider">
        C. JUEZ DEL TRIBUNAL LABORAL FEDERAL
      </p>
      <p className="text-center font-bold text-sm mb-6 tracking-wider">
        EN TURNO. PRESENTE.
      </p>
      <p className="text-sm mb-4">
        <Hl>{hl(data.parteActora)}</Hl>, por mi propio derecho, señalando
        domicilio para oír y recibir notificaciones en esta ciudad, ante Usted
        con el debido respeto comparezco para exponer:
      </p>
      <p className="text-sm mb-6">
        Que vengo a demandar de <Hl>{hl(data.parteDemandada)}</Hl> el pago y
        cumplimiento de las prestaciones que más adelante se detallan, con
        motivo del <strong>despido injustificado</strong> del que fui objeto.
      </p>
      <SectionTitle>Hechos</SectionTitle>
      <p className="text-sm mb-3">
        <strong>1.</strong> El suscrito ingresó a laborar para la demandada con
        fecha <Hl>{formatDateES(data.fechaIngreso)}</Hl>, desempeñando el
        puesto de <Hl>{hl(data.puesto)}</Hl>, percibiendo un salario diario de{" "}
        <Hl>${hl(data.salario)}</Hl>.
      </p>
      <p className="text-sm mb-6">
        <strong>2.</strong> Con fecha <Hl>{formatDateES(data.fechaDespido)}</Hl>{" "}
        fui despedido de manera injustificada, sin que mediara causa alguna de
        las previstas en el artículo 47 de la Ley Federal del Trabajo.
      </p>
      <SectionTitle>Prestaciones</SectionTitle>
      <p className="text-sm">
        <strong>a)</strong> Indemnización constitucional de tres meses de
        salario. <strong>b)</strong> Salarios caídos. <strong>c)</strong> Prima
        de antigüedad. <strong>d)</strong> Aguinaldo y vacaciones
        proporcionales.
      </p>
    </>
  );
}

function PreviewContestacion({ data }: { data: Record<string, string> }) {
  return (
    <>
      <p className="text-center font-bold text-sm mb-1 tracking-wider">
        C. JUEZ DEL TRIBUNAL LABORAL FEDERAL
      </p>
      <p className="text-center font-bold text-sm mb-6 tracking-wider">
        EXPEDIENTE: {hl(data.expediente)}
      </p>
      <p className="text-sm mb-4">
        <Hl>{hl(data.representanteLegal)}</Hl>, en mi carácter de apoderado
        legal de <Hl>{hl(data.parteDemandada)}</Hl>, personalidad que acredito
        con la escritura pública que adjunto, señalando domicilio para oír y
        recibir notificaciones, ante Usted con el debido respeto comparezco
        para:
      </p>
      <p className="text-sm mb-6">
        Dar contestación a la demanda laboral promovida por{" "}
        <Hl>{hl(data.parteActora)}</Hl> en contra de mi representada, en los
        siguientes términos:
      </p>
      <SectionTitle>Excepciones y defensas</SectionTitle>
      <p className="text-sm mb-3">
        <strong>1. Falta de acción y derecho.</strong> El actor carece de acción
        y derecho para reclamar las prestaciones que demanda, toda vez que la
        relación laboral se dio por terminada de manera voluntaria por el propio
        trabajador.
      </p>
      <p className="text-sm mb-3">
        <strong>2. Negativa del despido.</strong> Mi representada niega lisa y
        llanamente haber despedido al actor en la fecha señalada o en cualquier
        otra.
      </p>
      <p className="text-sm mb-6">
        <strong>3. Improcedencia de prestaciones.</strong> Son improcedentes las
        prestaciones reclamadas en virtud de que no existe despido injustificado
        que genere los conceptos demandados.
      </p>
      <SectionTitle>Contestación a los hechos</SectionTitle>
      <p className="text-sm">
        <strong>Al hecho 1.</strong> Es cierto que el actor prestó servicios
        para mi representada, sin embargo se niegan los términos y condiciones
        que señala. <strong>Al hecho 2.</strong> Se niega en todas y cada una de
        sus partes el supuesto despido que refiere el actor.
      </p>
    </>
  );
}

function PreviewContrato({ data }: { data: Record<string, string> }) {
  const duracionLabel = data.duracion === "indefinido"
    ? "por tiempo indefinido"
    : data.duracion === "temporal"
      ? "por obra o tiempo determinado"
      : "como período de prueba de 30 días conforme al artículo 39-A de la LFT";

  return (
    <>
      <p className="text-center font-bold text-sm mb-1 tracking-wider">
        CONTRATO INDIVIDUAL DE TRABAJO
      </p>
      <p className="text-center text-xs text-text-muted mb-6">
        Conforme a los artículos 20, 21 y 25 de la Ley Federal del Trabajo
      </p>
      <p className="text-sm mb-4">
        En la Ciudad de México, a <Hl>{formatDateES(data.fechaInicio)}</Hl>,
        celebran el presente contrato individual de trabajo, por una parte{" "}
        <Hl>{hl(data.nombrePatron)}</Hl>, en lo sucesivo &quot;el Patrón&quot;,
        y por la otra <Hl>{hl(data.nombreTrabajador)}</Hl>, en lo sucesivo
        &quot;el Trabajador&quot;, al tenor de las siguientes:
      </p>
      <SectionTitle>Cláusulas</SectionTitle>
      <p className="text-sm mb-3">
        <strong>PRIMERA.</strong> El Trabajador se obliga a prestar sus
        servicios personales subordinados al Patrón, desempeñando el puesto de{" "}
        <Hl>{hl(data.puesto)}</Hl>, en el centro de trabajo ubicado en{" "}
        <Hl>{hl(data.direccionTrabajo)}</Hl>.
      </p>
      <p className="text-sm mb-3">
        <strong>SEGUNDA.</strong> La duración de la relación de trabajo será{" "}
        <Hl>{duracionLabel}</Hl>.
      </p>
      <p className="text-sm mb-3">
        <strong>TERCERA.</strong> El Trabajador percibirá un salario diario de{" "}
        <Hl>${hl(data.salario)}</Hl> (pesos M.N.), pagadero de manera quincenal.
      </p>
      <p className="text-sm mb-3">
        <strong>CUARTA.</strong> La jornada de trabajo será: <Hl>{hl(data.horario)}</Hl>,
        sin exceder los máximos legales establecidos en los artículos 60 y 61
        de la Ley Federal del Trabajo.
      </p>
      <p className="text-sm mb-3">
        <strong>QUINTA.</strong> El Trabajador tendrá derecho a disfrutar de
        vacaciones, prima vacacional, aguinaldo y demás prestaciones conforme
        a la Ley Federal del Trabajo vigente.
      </p>
      <p className="text-sm mt-8 text-center text-text-muted text-xs">
        ____________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;____________________________
      </p>
      <p className="text-xs text-center text-text-muted">
        El Patrón&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;El Trabajador
      </p>
    </>
  );
}

function PreviewConvenio({ data }: { data: Record<string, string> }) {
  return (
    <>
      <p className="text-center font-bold text-sm mb-1 tracking-wider">
        CONVENIO DE TERMINACIÓN LABORAL
      </p>
      <p className="text-center text-xs text-text-muted mb-6">
        Por mutuo consentimiento — Art. 53, fracción I, LFT
      </p>
      <p className="text-sm mb-4">
        En la Ciudad de México, a <Hl>{formatDateES(data.fechaTerminacion)}</Hl>,
        comparecen por una parte <Hl>{hl(data.nombrePatron)}</Hl>, en lo
        sucesivo &quot;el Patrón&quot;, y por la otra{" "}
        <Hl>{hl(data.nombreTrabajador)}</Hl>, en lo sucesivo &quot;el
        Trabajador&quot;, quienes de común acuerdo convienen lo siguiente:
      </p>
      <SectionTitle>Declaraciones</SectionTitle>
      <p className="text-sm mb-3">
        <strong>1.</strong> El Trabajador ingresó a prestar sus servicios el día{" "}
        <Hl>{formatDateES(data.fechaIngreso)}</Hl>, desempeñando el puesto de{" "}
        <Hl>{hl(data.puesto)}</Hl>, con un salario diario de{" "}
        <Hl>${hl(data.salario)}</Hl>.
      </p>
      <p className="text-sm mb-6">
        <strong>2.</strong> Ambas partes manifiestan su libre voluntad de dar por
        terminada la relación laboral a partir de esta fecha, sin que exista
        coacción, engaño o presión de ninguna índole.
      </p>
      <SectionTitle>Cláusulas</SectionTitle>
      <p className="text-sm mb-3">
        <strong>PRIMERA.</strong> Las partes acuerdan dar por terminada la
        relación de trabajo por mutuo consentimiento, conforme al artículo 53,
        fracción I, de la Ley Federal del Trabajo.
      </p>
      <p className="text-sm mb-3">
        <strong>SEGUNDA.</strong> El Patrón se obliga a cubrir al Trabajador la
        cantidad total de <Hl>${hl(data.liquidacionTotal)}</Hl> (pesos M.N.) por
        concepto de liquidación, que incluye: indemnización, prima de
        antigüedad, vacaciones y prima vacacional proporcionales, aguinaldo
        proporcional, y demás prestaciones devengadas.
      </p>
      <p className="text-sm mb-3">
        <strong>TERCERA.</strong> El Trabajador manifiesta que con el pago
        señalado en la cláusula anterior queda debidamente liquidado, sin
        reservarse acción alguna presente o futura que ejercitar en contra del
        Patrón.
      </p>
      <p className="text-sm mt-8 text-center text-text-muted text-xs">
        ____________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;____________________________
      </p>
      <p className="text-xs text-center text-text-muted">
        El Patrón&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;El Trabajador
      </p>
    </>
  );
}

function buildDocxParagraphs(
  templateId: string,
  data: Record<string, string>,
  docx: {
    Document: typeof import("docx").Document;
    Paragraph: typeof import("docx").Paragraph;
    TextRun: typeof import("docx").TextRun;
    AlignmentType: typeof import("docx").AlignmentType;
    HeadingLevel: typeof import("docx").HeadingLevel;
  }
): InstanceType<typeof import("docx").Paragraph>[] {
  const { Paragraph, TextRun, AlignmentType } = docx;

  const centered = (text: string, bold = true) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold, size: 24 })],
    });

  const normal = (...runs: InstanceType<typeof TextRun>[]) =>
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      children: runs,
    });

  const bold = (text: string) => new TextRun({ text, bold: true, size: 24 });
  const plain = (text: string) => new TextRun({ text, size: 24 });
  const underlined = (text: string) => new TextRun({ text, bold: true, underline: {}, size: 24 });

  const sectionHeading = (text: string) =>
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text, bold: true, allCaps: true, size: 22 })],
    });

  const emptyLine = () => new Paragraph({ children: [] });

  const signatureLine = () =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
      children: [
        plain("____________________________          ____________________________"),
      ],
    });

  const signatureLabels = (left: string, right: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [plain(`${left}               ${right}`)],
    });

  if (templateId === "demanda") {
    return [
      centered("C. JUEZ DEL TRIBUNAL LABORAL FEDERAL"),
      centered("EN TURNO. PRESENTE."),
      emptyLine(),
      normal(
        underlined(hl(data.parteActora)),
        plain(", por mi propio derecho, señalando domicilio para oír y recibir notificaciones en esta ciudad, ante Usted con el debido respeto comparezco para exponer:")
      ),
      normal(
        plain("Que vengo a demandar de "),
        underlined(hl(data.parteDemandada)),
        plain(" el pago y cumplimiento de las prestaciones que más adelante se detallan, con motivo del "),
        bold("despido injustificado"),
        plain(" del que fui objeto.")
      ),
      sectionHeading("HECHOS"),
      normal(
        bold("1. "),
        plain("El suscrito ingresó a laborar para la demandada con fecha "),
        underlined(formatDateES(data.fechaIngreso)),
        plain(", desempeñando el puesto de "),
        underlined(hl(data.puesto)),
        plain(", percibiendo un salario diario de "),
        underlined("$" + hl(data.salario)),
        plain(".")
      ),
      normal(
        bold("2. "),
        plain("Con fecha "),
        underlined(formatDateES(data.fechaDespido)),
        plain(" fui despedido de manera injustificada, sin que mediara causa alguna de las previstas en el artículo 47 de la Ley Federal del Trabajo.")
      ),
      sectionHeading("PRESTACIONES"),
      normal(
        bold("a) "),
        plain("Indemnización constitucional de tres meses de salario. "),
        bold("b) "),
        plain("Salarios caídos. "),
        bold("c) "),
        plain("Prima de antigüedad. "),
        bold("d) "),
        plain("Aguinaldo y vacaciones proporcionales.")
      ),
    ];
  }

  if (templateId === "contestacion") {
    return [
      centered("C. JUEZ DEL TRIBUNAL LABORAL FEDERAL"),
      centered(`EXPEDIENTE: ${hl(data.expediente)}`),
      emptyLine(),
      normal(
        underlined(hl(data.representanteLegal)),
        plain(", en mi carácter de apoderado legal de "),
        underlined(hl(data.parteDemandada)),
        plain(", personalidad que acredito con la escritura pública que adjunto, señalando domicilio para oír y recibir notificaciones, ante Usted con el debido respeto comparezco para:")
      ),
      normal(
        plain("Dar contestación a la demanda laboral promovida por "),
        underlined(hl(data.parteActora)),
        plain(" en contra de mi representada, en los siguientes términos:")
      ),
      sectionHeading("EXCEPCIONES Y DEFENSAS"),
      normal(
        bold("1. Falta de acción y derecho. "),
        plain("El actor carece de acción y derecho para reclamar las prestaciones que demanda, toda vez que la relación laboral se dio por terminada de manera voluntaria por el propio trabajador.")
      ),
      normal(
        bold("2. Negativa del despido. "),
        plain("Mi representada niega lisa y llanamente haber despedido al actor en la fecha señalada o en cualquier otra.")
      ),
      normal(
        bold("3. Improcedencia de prestaciones. "),
        plain("Son improcedentes las prestaciones reclamadas en virtud de que no existe despido injustificado que genere los conceptos demandados.")
      ),
      sectionHeading("CONTESTACIÓN A LOS HECHOS"),
      normal(
        bold("Al hecho 1. "),
        plain("Es cierto que el actor prestó servicios para mi representada, sin embargo se niegan los términos y condiciones que señala. "),
        bold("Al hecho 2. "),
        plain("Se niega en todas y cada una de sus partes el supuesto despido que refiere el actor.")
      ),
    ];
  }

  if (templateId === "contrato") {
    const duracionLabel = data.duracion === "indefinido"
      ? "por tiempo indefinido"
      : data.duracion === "temporal"
        ? "por obra o tiempo determinado"
        : "como período de prueba de 30 días conforme al artículo 39-A de la LFT";

    return [
      centered("CONTRATO INDIVIDUAL DE TRABAJO"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "Conforme a los artículos 20, 21 y 25 de la Ley Federal del Trabajo", italics: true, size: 20 })],
      }),
      normal(
        plain("En la Ciudad de México, a "),
        underlined(formatDateES(data.fechaInicio)),
        plain(", celebran el presente contrato individual de trabajo, por una parte "),
        underlined(hl(data.nombrePatron)),
        plain(', en lo sucesivo "el Patrón", y por la otra '),
        underlined(hl(data.nombreTrabajador)),
        plain(', en lo sucesivo "el Trabajador", al tenor de las siguientes:')
      ),
      sectionHeading("CLÁUSULAS"),
      normal(
        bold("PRIMERA. "),
        plain("El Trabajador se obliga a prestar sus servicios personales subordinados al Patrón, desempeñando el puesto de "),
        underlined(hl(data.puesto)),
        plain(", en el centro de trabajo ubicado en "),
        underlined(hl(data.direccionTrabajo)),
        plain(".")
      ),
      normal(
        bold("SEGUNDA. "),
        plain("La duración de la relación de trabajo será "),
        underlined(duracionLabel),
        plain(".")
      ),
      normal(
        bold("TERCERA. "),
        plain("El Trabajador percibirá un salario diario de "),
        underlined("$" + hl(data.salario)),
        plain(" (pesos M.N.), pagadero de manera quincenal.")
      ),
      normal(
        bold("CUARTA. "),
        plain("La jornada de trabajo será: "),
        underlined(hl(data.horario)),
        plain(", sin exceder los máximos legales establecidos en los artículos 60 y 61 de la Ley Federal del Trabajo.")
      ),
      normal(
        bold("QUINTA. "),
        plain("El Trabajador tendrá derecho a disfrutar de vacaciones, prima vacacional, aguinaldo y demás prestaciones conforme a la Ley Federal del Trabajo vigente.")
      ),
      signatureLine(),
      signatureLabels("El Patrón", "El Trabajador"),
    ];
  }

  // convenio
  return [
    centered("CONVENIO DE TERMINACIÓN LABORAL"),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "Por mutuo consentimiento — Art. 53, fracción I, LFT", italics: true, size: 20 })],
    }),
    normal(
      plain("En la Ciudad de México, a "),
      underlined(formatDateES(data.fechaTerminacion)),
      plain(", comparecen por una parte "),
      underlined(hl(data.nombrePatron)),
      plain(', en lo sucesivo "el Patrón", y por la otra '),
      underlined(hl(data.nombreTrabajador)),
      plain(', en lo sucesivo "el Trabajador", quienes de común acuerdo convienen lo siguiente:')
    ),
    sectionHeading("DECLARACIONES"),
    normal(
      bold("1. "),
      plain("El Trabajador ingresó a prestar sus servicios el día "),
      underlined(formatDateES(data.fechaIngreso)),
      plain(", desempeñando el puesto de "),
      underlined(hl(data.puesto)),
      plain(", con un salario diario de "),
      underlined("$" + hl(data.salario)),
      plain(".")
    ),
    normal(
      bold("2. "),
      plain("Ambas partes manifiestan su libre voluntad de dar por terminada la relación laboral a partir de esta fecha, sin que exista coacción, engaño o presión de ninguna índole.")
    ),
    sectionHeading("CLÁUSULAS"),
    normal(
      bold("PRIMERA. "),
      plain("Las partes acuerdan dar por terminada la relación de trabajo por mutuo consentimiento, conforme al artículo 53, fracción I, de la Ley Federal del Trabajo.")
    ),
    normal(
      bold("SEGUNDA. "),
      plain("El Patrón se obliga a cubrir al Trabajador la cantidad total de "),
      underlined("$" + hl(data.liquidacionTotal)),
      plain(" (pesos M.N.) por concepto de liquidación, que incluye: indemnización, prima de antigüedad, vacaciones y prima vacacional proporcionales, aguinaldo proporcional, y demás prestaciones devengadas.")
    ),
    normal(
      bold("TERCERA. "),
      plain("El Trabajador manifiesta que con el pago señalado en la cláusula anterior queda debidamente liquidado, sin reservarse acción alguna presente o futura que ejercitar en contra del Patrón.")
    ),
    signatureLine(),
    signatureLabels("El Patrón", "El Trabajador"),
  ];
}
