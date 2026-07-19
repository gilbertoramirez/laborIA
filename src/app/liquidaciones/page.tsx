"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Download } from "lucide-react";

const SALARIO_MINIMO = 278.8;

type TipoSeparacion =
  | "despido_injustificado"
  | "renuncia_voluntaria"
  | "rescision_justificada";

const tipoLabels: Record<TipoSeparacion, string> = {
  despido_injustificado: "Despido injustificado",
  renuncia_voluntaria: "Renuncia voluntaria",
  rescision_justificada: "Rescisión justificada (patrón)",
};

function calcAnios(ingreso: string, baja: string): number {
  if (!ingreso || !baja) return 0;
  const d1 = new Date(ingreso);
  const d2 = new Date(baja);
  const diff = d2.getTime() - d1.getTime();
  return Math.max(0, diff / (365.25 * 24 * 60 * 60 * 1000));
}

function calcDiasEnAnio(baja: string): number {
  if (!baja) return 0;
  const d = new Date(baja);
  const inicio = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(
    (d.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)
  ) + 1;
}

function formatMXN(n: number): string {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function Liquidaciones() {
  const [tipo, setTipo] = useState<TipoSeparacion>("despido_injustificado");
  const [salarioDiario, setSalarioDiario] = useState(450);
  const [fechaIngreso, setFechaIngreso] = useState("2019-03-01");
  const [fechaBaja, setFechaBaja] = useState("2026-06-30");
  const [diasAguinaldo, setDiasAguinaldo] = useState(15);
  const [diasVacaciones, setDiasVacaciones] = useState(8);

  const calculo = useMemo(() => {
    const anios = calcAnios(fechaIngreso, fechaBaja);
    const aniosCompletos = Math.floor(anios);

    const sdi =
      salarioDiario *
      (1 + diasAguinaldo / 365 + (diasVacaciones * 0.25) / 365);

    const topeSdi = Math.min(sdi, 2 * SALARIO_MINIMO);
    const diasEnAnio = calcDiasEnAnio(fechaBaja);

    const conceptos: { nombre: string; base: string; importe: number }[] = [];

    if (tipo === "despido_injustificado") {
      conceptos.push({
        nombre: "Indemnización constitucional",
        base: "90 días SDI",
        importe: Math.round(90 * sdi),
      });
      conceptos.push({
        nombre: "Prima de antigüedad",
        base: "12 días × año",
        importe: Math.round(12 * topeSdi * aniosCompletos),
      });
      conceptos.push({
        nombre: "20 días por año",
        base: "20 días SDI × año",
        importe: Math.round(20 * sdi * aniosCompletos),
      });
      conceptos.push({
        nombre: "Salarios caídos",
        base: "tope 12 meses",
        importe: Math.round(sdi * 365),
      });
    } else if (tipo === "rescision_justificada") {
      conceptos.push({
        nombre: "Indemnización constitucional",
        base: "90 días SDI",
        importe: Math.round(90 * sdi),
      });
      conceptos.push({
        nombre: "Prima de antigüedad",
        base: "12 días × año",
        importe: Math.round(12 * topeSdi * aniosCompletos),
      });
      conceptos.push({
        nombre: "20 días por año",
        base: "20 días SDI × año",
        importe: Math.round(20 * sdi * aniosCompletos),
      });
    } else {
      conceptos.push({
        nombre: "Prima de antigüedad",
        base: "12 días × año",
        importe: Math.round(12 * topeSdi * aniosCompletos),
      });
    }

    conceptos.push({
      nombre: "Aguinaldo proporcional",
      base: `${diasAguinaldo} días × año`,
      importe: Math.round(
        salarioDiario * diasAguinaldo * (diasEnAnio / 365)
      ),
    });
    conceptos.push({
      nombre: "Vacaciones pendientes",
      base: `${diasVacaciones} días`,
      importe: Math.round(salarioDiario * diasVacaciones),
    });
    conceptos.push({
      nombre: "Prima vacacional",
      base: "25%",
      importe: Math.round(salarioDiario * diasVacaciones * 0.25),
    });

    const total = conceptos.reduce((s, c) => s + c.importe, 0);

    return { sdi: Math.round(sdi), anios, conceptos, total };
  }, [
    tipo,
    salarioDiario,
    fechaIngreso,
    fechaBaja,
    diasAguinaldo,
    diasVacaciones,
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-10 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Calculadora de liquidaciones
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Finiquitos, indemnizaciones y cuantificación conforme a la LFT
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

      <div className="grid grid-cols-2 gap-8 animate-fade-in animate-fade-in-delay-1">
        {/* Left: Form */}
        <div className="bg-white rounded-xl border border-border p-7">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-6">
            Datos de la relación laboral
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Tipo de separación
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoSeparacion)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              >
                {Object.entries(tipoLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                Salario diario (MXN)
              </label>
              <input
                type="number"
                value={salarioDiario}
                onChange={(e) => setSalarioDiario(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Fecha de ingreso
                </label>
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Fecha de baja
                </label>
                <input
                  type="date"
                  value={fechaBaja}
                  onChange={(e) => setFechaBaja(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Días de aguinaldo
                </label>
                <input
                  type="number"
                  value={diasAguinaldo}
                  onChange={(e) => setDiasAguinaldo(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Vacaciones pendientes (días)
                </label>
                <input
                  type="number"
                  value={diasVacaciones}
                  onChange={(e) => setDiasVacaciones(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors tabular-nums"
                />
              </div>
            </div>

            <hr className="border-border" />

            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Antigüedad</span>
              <span className="font-semibold tabular-nums">
                {calculo.anios.toFixed(1)} años
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                Salario diario integrado
              </span>
              <span className="font-semibold tabular-nums">
                {formatMXN(calculo.sdi)}
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed pt-2">
              Cálculo referencial conforme a la LFT. La prima de antigüedad se
              topa a 2 salarios mínimos; verifica los conceptos antes de
              cuantificar la demanda.
            </p>
          </div>
        </div>

        {/* Right: Results */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Desglose de la liquidación
            </h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors">
              <Download size={15} />
              Exportar PDF
            </button>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3">
                    Concepto
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3">
                    Base
                  </th>
                  <th className="text-right text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {calculo.conceptos.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-stone-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-text-primary">
                      {c.nombre}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-muted">
                      {c.base}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right font-semibold tabular-nums">
                      {formatMXN(c.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl p-6 flex items-center justify-between shadow-lg" style={{ background: 'linear-gradient(135deg, #8C3420, #C94A2E, #B5432A)' }}>
            <span className="text-white/90 text-sm font-semibold uppercase tracking-wider">
              Total a liquidar
            </span>
            <span className="text-white text-3xl font-bold tabular-nums">
              {formatMXN(calculo.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
