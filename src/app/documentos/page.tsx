"use client";

import { useState } from "react";
import { Search, Plus, FileText, FileCheck, Handshake, ScrollText } from "lucide-react";
import Link from "next/link";

const plantillas = [
  { id: "demanda", label: "Demanda laboral", icon: FileText, active: true },
  { id: "contestacion", label: "Contestación", icon: FileCheck },
  { id: "contrato", label: "Contrato individual", icon: ScrollText },
  { id: "convenio", label: "Convenio", icon: Handshake },
];

export default function Documentos() {
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Automatizador de documentos
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Builder dinámico de demandas, contratos y convenios
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors">
            <Search size={16} />
            Buscar
          </button>
          <Link href="/casos?nuevo=1" className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]">
            <Plus size={16} />
            Nuevo caso
          </Link>
        </div>
      </div>

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
    </div>
  );
}
