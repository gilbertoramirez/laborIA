"use client";

import { useState } from "react";
import { Search, Plus, Download, Sparkles, Play, Pause } from "lucide-react";

const transcripcion = [
  {
    speaker: "DEMANDADO",
    time: "18:02",
    text: '"...sí, la persona trabajó para la empresa ',
    highlight: "desde marzo de 2019",
    textAfter: ', con el puesto de operador de línea."',
    marker: { type: "admision", label: "Admisión — antigüedad" },
  },
  {
    speaker: "JUEZ",
    time: "19:15",
    text: '"¿La empresa cuenta con el registro de asistencia del periodo señalado?"',
  },
  {
    speaker: "DEMANDADO",
    time: "19:31",
    text: '"En este momento ',
    highlight: "no contamos con el control de asistencia",
    textAfter: '..."',
    marker: { type: "omision", label: "Omisión probatoria" },
  },
  {
    speaker: "ACTOR",
    time: "21:40",
    text: '"Ratifico en todas sus partes el escrito inicial de demanda y ofrezco..."',
  },
  {
    speaker: "JUEZ",
    time: "24:10",
    text: '"Se hace constar que la parte actora impugna el documento exhibido por carecer de..."',
    marker: { type: "objecion", label: "Objeción documental" },
  },
  {
    speaker: "DEMANDADO",
    time: "28:45",
    text: '"Reconocemos que el salario del trabajador era de cuatrocientos cincuenta pesos diarios..."',
    marker: { type: "admision", label: "Admisión — salario" },
  },
];

const marcadores = [
  {
    type: "admision",
    time: "18:02",
    label: "Admisión — antigüedad",
    desc: "Reconoce inicio de labores en marzo de 2019.",
  },
  {
    type: "omision",
    time: "19:31",
    label: "Omisión probatoria",
    desc: "Sin control de asistencia del periodo.",
  },
  {
    type: "objecion",
    time: "24:10",
    label: "Objeción",
    desc: "Impugna documental por falta de firma.",
  },
  {
    type: "admision",
    time: "28:45",
    label: "Admisión — salario",
    desc: "Confirma salario diario de $450.",
  },
];

const estrategia = [
  {
    titulo: "Antigüedad confirmada",
    detalle:
      "El representante legal de la demandada reconoció expresamente la fecha de inicio de labores (marzo 2019), lo cual elimina la necesidad de probar este hecho.",
    relevancia: "alta",
  },
  {
    titulo: "Ausencia de control de asistencia",
    detalle:
      "La empresa admitió no contar con registros de asistencia. Esto genera una presunción favorable al trabajador respecto a las jornadas laboradas (Art. 784 LFT).",
    relevancia: "alta",
  },
  {
    titulo: "Documentos impugnados",
    detalle:
      "Se impugnó un documento por carecer de firma, lo cual debilita la posición probatoria de la demandada si no logra perfeccionar la prueba.",
    relevancia: "media",
  },
  {
    titulo: "Salario reconocido",
    detalle:
      "El salario de $450 diarios fue reconocido, lo cual simplifica la cuantificación de prestaciones.",
    relevancia: "alta",
  },
  {
    titulo: "Ratificación de demanda",
    detalle:
      "El actor ratificó íntegramente su escrito de demanda y ofreció pruebas en tiempo y forma.",
    relevancia: "baja",
  },
];

function markerStyle(type: string) {
  switch (type) {
    case "admision":
      return "bg-brand-light text-brand border-brand/20";
    case "omision":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "objecion":
      return "bg-stone-100 text-text-secondary border-stone-300";
    default:
      return "bg-stone-100 text-text-secondary border-stone-200";
  }
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

export default function Audiencias() {
  const [tab, setTab] = useState<"transcripcion" | "estrategia" | "resumen">(
    "transcripcion"
  );
  const [playing, setPlaying] = useState(false);

  const waveformBars = Array.from({ length: 60 }, (_, i) => {
    const h = Math.sin(i * 0.3) * 0.5 + Math.random() * 0.5;
    return Math.max(0.15, Math.min(1, h));
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Audiencias — Juicio Oral
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Transcripción y extracción de estrategia
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

      {/* Audiencia header */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6 animate-fade-in animate-fade-in-delay-1">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center">
                <Sparkles size={16} className="text-brand" />
              </div>
              <h2 className="font-display text-xl text-text-primary">
                Audiencia preliminar — López Herrera vs. Grupo Ferro
              </h2>
            </div>
            <p className="text-sm text-text-muted ml-11">
              Tribunal Laboral Federal &middot; 14 jul 2026 &middot; 00:47:12
              &middot; Transcripción completa
            </p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors">
              <Download size={15} />
              Exportar
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]">
              <Sparkles size={15} />
              Extraer estrategia
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6 animate-fade-in animate-fade-in-delay-2">
        {/* Left: Player + Markers */}
        <div className="col-span-2 space-y-6">
          {/* Audio player */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-end gap-[3px] h-16 mb-4">
              {waveformBars.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < 23 ? "bg-brand" : "bg-stone-200"
                  }`}
                  style={{ height: `${h * 100}%` }}
                />
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-dark transition-colors active:scale-95"
              >
                {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: "38%" }} />
                </div>
              </div>
              <span className="text-xs text-text-muted font-mono tabular-nums">
                18:02 / 47:12
              </span>
            </div>
          </div>

          {/* Strategy markers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Marcadores de estrategia
            </h3>
            <div className="space-y-2">
              {marcadores.map((m, i) => (
                <button
                  key={i}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all hover:shadow-sm ${markerStyle(
                    m.type
                  )}`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold">{m.label}</span>
                    <span className="text-xs opacity-60 font-mono">
                      {m.time}
                    </span>
                  </div>
                  <p className="text-xs opacity-75">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="col-span-3">
          <div className="flex gap-1 mb-4 border-b border-border">
            {(
              [
                ["transcripcion", "Transcripción"],
                ["estrategia", `Estrategia (${estrategia.length})`],
                ["resumen", "Resumen"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                  tab === key
                    ? "border-brand text-brand font-medium"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "transcripcion" && (
            <div className="space-y-1">
              {transcripcion.map((t, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-lg hover:bg-white transition-colors"
                >
                  <div className="w-28 shrink-0">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      {t.speaker}
                    </p>
                    <p className="text-xs text-text-muted font-mono mt-0.5">
                      {t.time}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-relaxed">
                      {t.text}
                      {t.highlight && (
                        <span className="font-semibold underline decoration-brand/40 decoration-2 underline-offset-2">
                          {t.highlight}
                        </span>
                      )}
                      {t.textAfter}
                    </p>
                    {t.marker && (
                      <span
                        className={`inline-block mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full border ${markerStyle(
                          t.marker.type
                        )}`}
                      >
                        {t.marker.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "estrategia" && (
            <div className="space-y-3">
              {estrategia.map((e, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-border p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {e.titulo}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${relevanciaStyle(
                        e.relevancia
                      )}`}
                    >
                      {e.relevancia}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {e.detalle}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === "resumen" && (
            <div className="bg-white rounded-xl border border-border p-6">
              <h4 className="font-display text-lg text-text-primary mb-3">
                Resumen de la audiencia
              </h4>
              <div className="text-sm text-text-secondary leading-relaxed space-y-3">
                <p>
                  En la audiencia preliminar del caso López Herrera vs. Grupo
                  Ferro, celebrada el 14 de julio de 2026 ante el Tribunal
                  Laboral Federal, se obtuvieron avances significativos para la
                  parte actora.
                </p>
                <p>
                  La demandada realizó dos admisiones relevantes: reconoció
                  expresamente la fecha de inicio de la relación laboral (marzo
                  de 2019) y el salario diario de $450. Adicionalmente, admitió
                  no contar con registros de control de asistencia, lo cual
                  genera una presunción favorable al trabajador conforme al
                  artículo 784 de la LFT.
                </p>
                <p>
                  Se impugnó exitosamente un documento presentado por la
                  demandada por carecer de firma, debilitando su posición
                  probatoria. El actor ratificó su demanda y ofreció pruebas en
                  tiempo procesal.
                </p>
                <p className="font-medium text-text-primary">
                  Recomendación: preparar el ofrecimiento de pruebas
                  aprovechando las admisiones y la omisión probatoria de la
                  demandada como eje central de la estrategia.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
