"use client";

import { useState } from "react";
import { Search, Plus } from "lucide-react";

type Etapa = "Conciliación" | "Instrucción" | "Juicio";
type Filtro = "Todos" | Etapa;

interface Caso {
  cliente: string;
  materia: string;
  etapa: Etapa;
  proximoPlazo: string;
  diasPlazo: number;
  cuantia: number;
  plazoLabel: string;
  plazoFecha: string;
}

const casos: Caso[] = [
  {
    cliente: "López Herrera vs. Grupo Ferro",
    materia: "Despido injustificado",
    etapa: "Juicio",
    proximoPlazo: "Ofrec. pruebas",
    diasPlazo: 2,
    cuantia: 418200,
    plazoLabel: "Ofrecimiento de pruebas",
    plazoFecha: "Mié 21 jul",
  },
  {
    cliente: "Ramírez Ortega vs. Manuf. Bajío",
    materia: "Rescisión",
    etapa: "Instrucción",
    proximoPlazo: "Aud. preliminar",
    diasPlazo: 4,
    cuantia: 292750,
    plazoLabel: "Audiencia preliminar",
    plazoFecha: "Vie 23 jul",
  },
  {
    cliente: "Mendoza vs. Servicios Int. MX",
    materia: "Horas extra",
    etapa: "Instrucción",
    proximoPlazo: "Contestación",
    diasPlazo: 7,
    cuantia: 97400,
    plazoLabel: "Contestación",
    plazoFecha: "Lun 26 jul",
  },
  {
    cliente: "Vargas vs. Distribuidora Norte",
    materia: "Prima de antigüedad",
    etapa: "Conciliación",
    proximoPlazo: "Audiencia CFCRL",
    diasPlazo: 12,
    cuantia: 61900,
    plazoLabel: "Audiencia CFCRL",
    plazoFecha: "Sáb 31 jul",
  },
  {
    cliente: "Ibarra vs. Constructora Real",
    materia: "Riesgo de trabajo",
    etapa: "Juicio",
    proximoPlazo: "Alegatos",
    diasPlazo: 15,
    cuantia: 540000,
    plazoLabel: "Alegatos",
    plazoFecha: "Vie 5 ago",
  },
];

function etapaStyle(etapa: Etapa) {
  switch (etapa) {
    case "Juicio":
      return "bg-brand-light text-brand";
    case "Instrucción":
      return "bg-stone-100 text-text-secondary";
    case "Conciliación":
      return "bg-amber-50 text-amber-700";
  }
}

function urgencyBorder(dias: number) {
  if (dias <= 2) return "border-l-brand";
  if (dias <= 5) return "border-l-warning";
  if (dias <= 7) return "border-l-amber-300";
  return "border-l-stone-300";
}

function urgencyText(dias: number) {
  if (dias <= 2) return "text-brand font-bold";
  if (dias <= 5) return "text-warning font-semibold";
  return "text-text-muted font-medium";
}

function formatCuantia(n: number) {
  return "$" + n.toLocaleString("es-MX");
}

export default function Casos() {
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [busqueda, setBusqueda] = useState("");

  const filtrados = casos.filter((c) => {
    if (filtro !== "Todos" && c.etapa !== filtro) return false;
    if (
      busqueda &&
      !c.cliente.toLowerCase().includes(busqueda.toLowerCase()) &&
      !c.materia.toLowerCase().includes(busqueda.toLowerCase())
    )
      return false;
    return true;
  });

  const plazosOrdenados = [...casos].sort((a, b) => a.diasPlazo - b.diasPlazo);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Gestor de casos y plazos
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Trazabilidad y control de términos procesales
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

      <div className="grid grid-cols-3 gap-6 animate-fade-in animate-fade-in-delay-1">
        {/* Left: Table */}
        <div className="col-span-2">
          {/* Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {(
                ["Todos", "Conciliación", "Instrucción", "Juicio"] as Filtro[]
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-3.5 py-1.5 text-sm rounded-lg transition-colors ${
                    filtro === f
                      ? "bg-text-primary text-white"
                      : "text-text-secondary hover:bg-stone-100"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Filtrar por cliente o materia..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 pr-4 py-2 border border-border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Cliente / Contraparte",
                    "Materia",
                    "Etapa",
                    "Próximo plazo",
                    "Cuantía",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3 text-left ${
                        h === "Cuantía" ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-stone-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-text-primary">
                      {c.cliente}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {c.materia}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${etapaStyle(
                          c.etapa
                        )}`}
                      >
                        {c.etapa}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {c.proximoPlazo} &middot; {c.diasPlazo}d
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right font-semibold tabular-nums">
                      {formatCuantia(c.cuantia)}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-text-muted"
                    >
                      No se encontraron casos con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Timeline */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">
            Línea de plazos
          </h2>
          <div className="space-y-2">
            {plazosOrdenados.map((c, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl border border-border p-4 border-l-4 ${urgencyBorder(
                  c.diasPlazo
                )} hover:shadow-sm transition-shadow ${
                  c.diasPlazo <= 2 ? "animate-pulse-urgent" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {c.plazoLabel}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {c.cliente.split(" vs.")[0]} &middot; {c.plazoFecha}
                    </p>
                  </div>
                  <span
                    className={`text-lg tabular-nums ${urgencyText(
                      c.diasPlazo
                    )}`}
                  >
                    {c.diasPlazo}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
