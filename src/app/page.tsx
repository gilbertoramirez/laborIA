"use client";

import {
  Search,
  Plus,
  Calculator,
  AudioLines,
  FileText,
  Briefcase,
  Scale,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { value: "24", label: "Casos activos" },
  { value: "7", label: "Plazos esta semana", urgent: true },
  { value: "3", label: "Audiencias próximas" },
  { value: "128", label: "Docs generados" },
];

const modulesGrid = [
  {
    id: "02",
    title: "Audiencias",
    subtitle: "Juicio Oral",
    desc: "Transcribe audio y video de las audiencias y extrae la estrategia: contradicciones, admisiones y objeciones marcadas en la línea de tiempo.",
    icon: AudioLines,
    href: "/audiencias",
    badge: "3 audiencias sin procesar",
    featured: true,
  },
  {
    id: "01",
    title: "Liquidaciones",
    desc: "Finiquitos e indemnizaciones sin error.",
    icon: Calculator,
    href: "/liquidaciones",
  },
  {
    id: "03",
    title: "Documentos",
    desc: "Demandas y contratos con variables.",
    icon: FileText,
    href: "/documentos",
  },
  {
    id: "04",
    title: "Casos y plazos",
    desc: "CRM con control de términos.",
    icon: Briefcase,
    href: "/casos",
  },
  {
    id: "05",
    title: "Jurisprudencia",
    desc: "Tesis y argumentación con IA.",
    icon: Scale,
    href: "/jurisprudencia",
  },
];

const plazos = [
  {
    caso: "López Herrera vs. Grupo Ferro",
    tramite: "Ofrecimiento de pruebas",
    vence: "Mié 21 jul",
    dias: 2,
  },
  {
    caso: "Ramírez Ortega vs. Manuf. Bajío",
    tramite: "Audiencia preliminar",
    vence: "Vie 23 jul",
    dias: 4,
  },
  {
    caso: "Mendoza vs. Servicios Int. MX",
    tramite: "Contestación de demanda",
    vence: "Lun 26 jul",
    dias: 7,
  },
];

const actividad = [
  {
    icon: Calculator,
    text: "Liquidación calculada",
    caso: "Ibarra vs. Constructora Real",
    time: "hace 2 h",
  },
  {
    icon: AudioLines,
    text: "Audiencia transcrita",
    caso: "López Herrera",
    time: "ayer",
  },
  {
    icon: FileText,
    text: "Demanda generada",
    caso: "Mendoza",
    time: "ayer",
  },
];

function urgencyColor(dias: number) {
  if (dias <= 2) return "text-urgent bg-red-50 border-red-200";
  if (dias <= 5) return "text-warning bg-amber-50 border-amber-200";
  return "text-text-secondary bg-stone-50 border-stone-200";
}

export default function Panorama() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Panorama del despacho
          </h1>
          <p className="text-text-muted mt-1 text-sm first-letter:uppercase">{dateStr}</p>
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

      <div className="grid grid-cols-4 gap-4 mb-10 animate-fade-in animate-fade-in-delay-1">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-border p-5"
          >
            <p
              className={`text-3xl font-semibold tabular-nums ${
                s.urgent ? "text-brand" : "text-text-primary"
              }`}
            >
              {s.value}
            </p>
            <p className="text-xs text-text-muted uppercase tracking-wider mt-1.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-10 animate-fade-in animate-fade-in-delay-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
          Módulos
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {modulesGrid.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className={`
                  group bg-white rounded-xl border border-border p-5
                  hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                  ${mod.featured ? "col-span-2 row-span-2 p-7" : ""}
                `}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      mod.featured
                        ? "bg-brand-light text-brand"
                        : "bg-stone-100 text-text-secondary group-hover:bg-brand-light group-hover:text-brand"
                    }`}
                  >
                    <Icon size={mod.featured ? 22 : 18} />
                  </div>
                  <div>
                    <h3
                      className={`font-display ${
                        mod.featured ? "text-xl" : "text-base"
                      } text-text-primary`}
                    >
                      {mod.id} &middot; {mod.title}
                      {mod.subtitle && (
                        <span className="text-text-muted">
                          {" "}
                          &mdash; {mod.subtitle}
                        </span>
                      )}
                    </h3>
                  </div>
                </div>
                <p
                  className={`text-text-secondary leading-relaxed ${
                    mod.featured ? "text-sm mt-2 max-w-lg" : "text-xs mt-1"
                  }`}
                >
                  {mod.desc}
                </p>
                {mod.badge && (
                  <span className="inline-block mt-4 px-3 py-1 text-xs font-medium text-brand border border-brand/30 rounded-full">
                    {mod.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6 animate-fade-in animate-fade-in-delay-3">
        <div className="col-span-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
            Próximos plazos procesales
          </h2>
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Caso", "Trámite", "Vence", "Estado"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3 ${
                        i === 3 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plazos.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-stone-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-text-primary">
                      {p.caso}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {p.tramite}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {p.vence}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${urgencyColor(
                          p.dias
                        )}`}
                      >
                        En {p.dias} días
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
            Actividad reciente
          </h2>
          <div className="space-y-3">
            {actividad.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-stone-100 text-text-muted shrink-0 mt-0.5">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-text-secondary">
                        {a.text} &mdash;{" "}
                        <span className="font-medium text-text-primary">
                          {a.caso}
                        </span>
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {a.time}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/casos"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-brand hover:text-brand-dark transition-colors"
          >
            Ver todos los casos
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
