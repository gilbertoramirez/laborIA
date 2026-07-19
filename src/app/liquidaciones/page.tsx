"use client";

import { useState, useCallback, useRef } from "react";
import { Search, Plus, Download, SlidersHorizontal, Info, Calculator, RotateCcw } from "lucide-react";

type TipoSeparacion =
  | "despido_injustificado"
  | "renuncia_voluntaria"
  | "rescision_justificada";

type AreaGeografica = "general" | "frontera";
type TipoJornada = "diurna" | "nocturna" | "mixta";

const tipoLabels: Record<TipoSeparacion, string> = {
  despido_injustificado: "Despido injustificado",
  renuncia_voluntaria: "Renuncia voluntaria",
  rescision_justificada: "Rescisión justificada (patrón)",
};

const SALARIOS_MINIMOS: Record<AreaGeografica, { valor: number; label: string }> = {
  general: { valor: 278.80, label: "Zona general — $278.80" },
  frontera: { valor: 419.88, label: "Zona libre frontera norte — $419.88" },
};

const HORAS_JORNADA: Record<TipoJornada, { horas: number; label: string }> = {
  diurna: { horas: 8, label: "Diurna (8 hrs)" },
  nocturna: { horas: 7, label: "Nocturna (7 hrs)" },
  mixta: { horas: 7.5, label: "Mixta (7.5 hrs)" },
};

interface Antiguedad {
  anios: number;
  meses: number;
  dias: number;
  totalAnios: number;
  aniosCompletos: number;
}

interface Concepto {
  nombre: string;
  base: string;
  importe: number;
  fundamento: string;
}

interface Resultado {
  sdi: number;
  factorIntegracion: number;
  antiguedad: Antiguedad;
  conceptos: Concepto[];
  subtotal: number;
  topeSdi: number;
  sm: number;
  timestamp: number;
}

function calcAntiguedad(ingreso: string, baja: string): Antiguedad {
  if (!ingreso || !baja) return { anios: 0, meses: 0, dias: 0, totalAnios: 0, aniosCompletos: 0 };
  const d1 = new Date(ingreso);
  const d2 = new Date(baja);
  if (d2 <= d1) return { anios: 0, meses: 0, dias: 0, totalAnios: 0, aniosCompletos: 0 };

  let anios = d2.getFullYear() - d1.getFullYear();
  let meses = d2.getMonth() - d1.getMonth();
  let dias = d2.getDate() - d1.getDate();

  if (dias < 0) {
    meses--;
    const lastMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
    dias += lastMonth.getDate();
  }
  if (meses < 0) {
    anios--;
    meses += 12;
  }

  const totalAnios = anios + meses / 12 + dias / 365.25;
  return { anios, meses, dias, totalAnios, aniosCompletos: anios };
}

function calcDiasEnAnio(baja: string): number {
  if (!baja) return 0;
  const d = new Date(baja);
  const inicio = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((d.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function formatMXN(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatMXNDec(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFechaES(d: string): string {
  if (!d) return "—";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export default function Liquidaciones() {
  // --- Form state ---
  const [tipo, setTipo] = useState<TipoSeparacion>("despido_injustificado");
  const [salarioDiario, setSalarioDiario] = useState<number | "">(0);
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [fechaBaja, setFechaBaja] = useState("");
  const [diasAguinaldo, setDiasAguinaldo] = useState(15);
  const [primaVacPct, setPrimaVacPct] = useState(25);
  const [diasVacaciones, setDiasVacaciones] = useState(0);
  const [areaGeo, setAreaGeo] = useState<AreaGeografica>("general");
  const [horasExtraSemana, setHorasExtraSemana] = useState(0);
  const [tipoJornada, setTipoJornada] = useState<TipoJornada>("diurna");
  const [nombreTrabajador, setNombreTrabajador] = useState("");
  const [nombrePatron, setNombrePatron] = useState("");

  // --- Result state (only populated on click) ---
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pctNegociacion, setPctNegociacion] = useState(100);
  const [flash, setFlash] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const sd = typeof salarioDiario === "number" ? salarioDiario : 0;
  const formValid = sd > 0 && fechaIngreso !== "" && fechaBaja !== "";

  // --- Core calculation ---
  const calcular = useCallback(() => {
    const antiguedad = calcAntiguedad(fechaIngreso, fechaBaja);
    const sm = SALARIOS_MINIMOS[areaGeo].valor;
    const primaVacDecimal = primaVacPct / 100;
    const factorIntegracion = 1 + diasAguinaldo / 365 + (diasVacaciones * primaVacDecimal) / 365;
    const sdi = sd * factorIntegracion;
    const topeSdi = Math.min(sdi, 2 * sm);
    const diasEnAnio = calcDiasEnAnio(fechaBaja);

    let importeHorasExtra = 0;
    if (horasExtraSemana > 0) {
      const horasJornada = HORAS_JORNADA[tipoJornada].horas;
      const horasDobles = Math.min(horasExtraSemana, 9);
      const horasTriples = Math.max(0, horasExtraSemana - 9);
      const salarioHora = sd / horasJornada;
      const semanasTrabajadas = Math.round(antiguedad.totalAnios * 52);
      importeHorasExtra = Math.round((horasDobles * salarioHora * 2 + horasTriples * salarioHora * 3) * semanasTrabajadas);
    }

    const conceptos: Concepto[] = [];

    if (tipo === "despido_injustificado") {
      conceptos.push({ nombre: "Indemnización constitucional", base: `90 días × SDI (${formatMXNDec(sdi)})`, importe: Math.round(90 * sdi), fundamento: "Art. 48 LFT" });
      conceptos.push({ nombre: "Prima de antigüedad", base: `12 días × ${antiguedad.aniosCompletos} años × ${formatMXNDec(topeSdi)}`, importe: Math.round(12 * topeSdi * antiguedad.aniosCompletos), fundamento: "Art. 162 LFT" });
      conceptos.push({ nombre: "20 días por año de servicio", base: `20 × SDI × ${antiguedad.aniosCompletos} años`, importe: Math.round(20 * sdi * antiguedad.aniosCompletos), fundamento: "Art. 50 fracc. II LFT" });
      conceptos.push({ nombre: "Salarios caídos", base: `SDI × 365 días (tope 12 meses)`, importe: Math.round(sdi * 365), fundamento: "Art. 48 LFT" });
    } else if (tipo === "rescision_justificada") {
      conceptos.push({ nombre: "Indemnización constitucional", base: `90 días × SDI (${formatMXNDec(sdi)})`, importe: Math.round(90 * sdi), fundamento: "Art. 50 fracc. I LFT" });
      conceptos.push({ nombre: "Prima de antigüedad", base: `12 días × ${antiguedad.aniosCompletos} años × ${formatMXNDec(topeSdi)}`, importe: Math.round(12 * topeSdi * antiguedad.aniosCompletos), fundamento: "Art. 162 LFT" });
      conceptos.push({ nombre: "20 días por año de servicio", base: `20 × SDI × ${antiguedad.aniosCompletos} años`, importe: Math.round(20 * sdi * antiguedad.aniosCompletos), fundamento: "Art. 50 fracc. II LFT" });
    } else {
      if (antiguedad.aniosCompletos >= 15) {
        conceptos.push({ nombre: "Prima de antigüedad", base: `12 días × ${antiguedad.aniosCompletos} años × ${formatMXNDec(topeSdi)}`, importe: Math.round(12 * topeSdi * antiguedad.aniosCompletos), fundamento: "Art. 162 LFT" });
      }
    }

    conceptos.push({ nombre: "Aguinaldo proporcional", base: `SD × ${diasAguinaldo} días × (${diasEnAnio}/365)`, importe: Math.round(sd * diasAguinaldo * (diasEnAnio / 365)), fundamento: "Art. 87 LFT" });
    conceptos.push({ nombre: "Vacaciones pendientes", base: `${diasVacaciones} días × SD (${formatMXNDec(sd)})`, importe: Math.round(sd * diasVacaciones), fundamento: "Art. 76 LFT" });
    conceptos.push({ nombre: "Prima vacacional", base: `${primaVacPct}% de vacaciones pendientes`, importe: Math.round(sd * diasVacaciones * primaVacDecimal), fundamento: "Art. 80 LFT" });

    if (importeHorasExtra > 0) {
      conceptos.push({ nombre: "Horas extra reclamadas", base: `${horasExtraSemana} hrs/sem × ${Math.round(antiguedad.totalAnios * 52)} semanas`, importe: importeHorasExtra, fundamento: "Arts. 66-68 LFT" });
    }

    const subtotal = conceptos.reduce((s, c) => s + c.importe, 0);

    setResultado({ sdi, factorIntegracion, antiguedad, conceptos, subtotal, topeSdi, sm, timestamp: Date.now() });
    setPctNegociacion(100);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [tipo, sd, fechaIngreso, fechaBaja, diasAguinaldo, primaVacPct, diasVacaciones, areaGeo, horasExtraSemana, tipoJornada]);

  const limpiar = useCallback(() => {
    setTipo("despido_injustificado");
    setSalarioDiario(0);
    setFechaIngreso("");
    setFechaBaja("");
    setDiasAguinaldo(15);
    setPrimaVacPct(25);
    setDiasVacaciones(0);
    setAreaGeo("general");
    setHorasExtraSemana(0);
    setTipoJornada("diurna");
    setNombreTrabajador("");
    setNombrePatron("");
    setResultado(null);
    setPctNegociacion(100);
  }, []);

  const totalNegociado = resultado ? Math.round(resultado.subtotal * (pctNegociacion / 100)) : 0;

  // --- PDF ---
  const generarPDF = useCallback(() => {
    if (!resultado) return;
    const { antiguedad, sdi, factorIntegracion, conceptos, subtotal, sm } = resultado;
    const fechaHoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

    const filas = conceptos.map((c) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;">${c.nombre}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:12px;color:#666;">${c.base}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:12px;color:#888;">${c.fundamento}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600;font-size:13px;font-variant-numeric:tabular-nums;">${formatMXN(c.importe)}</td></tr>`
    ).join("");

    const neg = pctNegociacion < 100
      ? `<div style="margin-top:24px;padding:16px 20px;background:#FFF8F0;border:1px solid #F0D0B0;border-radius:8px;"><p style="font-size:13px;color:#8B5E3C;margin:0 0 4px;">Monto negociado al <strong>${pctNegociacion}%</strong></p><p style="font-size:24px;font-weight:700;color:#8B5E3C;margin:0;font-variant-numeric:tabular-nums;">${formatMXN(totalNegociado)}</p></div>`
      : "";

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Cuantificación — ${nombreTrabajador || "Trabajador"} vs. ${nombrePatron || "Patrón"}</title><style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:20mm 15mm}}body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1C1917;max-width:800px;margin:0 auto;padding:40px 32px;line-height:1.5}h1{font-size:20px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border-bottom:3px solid #B5432A;padding-bottom:8px;margin-bottom:4px}.sub{font-size:12px;color:#78716C;margin-bottom:32px}.section{margin-bottom:28px}.section-title{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#78716C;margin-bottom:12px}.data-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}.data-item label{display:block;font-size:11px;color:#A8A29E;text-transform:uppercase;letter-spacing:.05em}.data-item span{font-size:14px;font-weight:500}table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#A8A29E;font-weight:600;padding:8px 12px;border-bottom:2px solid #E7E5E4}th:last-child{text-align:right}.total-row{background:#B5432A;color:#fff;padding:16px 20px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-top:12px}.total-label{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}.total-amount{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #E7E5E4;font-size:11px;color:#A8A29E}</style></head><body>
<h1>Cuantificación de Prestaciones Laborales</h1><p class="sub">Fecha de elaboración: ${fechaHoy}</p>
<div class="section"><p class="section-title">I. Datos Generales</p><div class="data-grid">
<div class="data-item"><label>Trabajador</label><span>${nombreTrabajador || "—"}</span></div>
<div class="data-item"><label>Patrón</label><span>${nombrePatron || "—"}</span></div>
<div class="data-item"><label>Tipo de separación</label><span>${tipoLabels[tipo]}</span></div>
<div class="data-item"><label>Antigüedad</label><span>${antiguedad.anios}a ${antiguedad.meses}m ${antiguedad.dias}d</span></div>
<div class="data-item"><label>Fecha de ingreso</label><span>${formatFechaES(fechaIngreso)}</span></div>
<div class="data-item"><label>Fecha de separación</label><span>${formatFechaES(fechaBaja)}</span></div>
<div class="data-item"><label>Salario diario</label><span>${formatMXNDec(sd)}</span></div>
<div class="data-item"><label>SDI</label><span>${formatMXNDec(sdi)} (factor ${factorIntegracion.toFixed(4)})</span></div>
<div class="data-item"><label>Salario mínimo</label><span>${formatMXNDec(sm)} (${areaGeo === "frontera" ? "ZLFN" : "General"})</span></div>
<div class="data-item"><label>Tope prima antigüedad</label><span>${formatMXNDec(sm * 2)}</span></div>
</div></div>
<div class="section"><p class="section-title">II. Desglose de Conceptos</p>
<table><thead><tr><th>Concepto</th><th>Base de cálculo</th><th>Fundamento</th><th>Importe</th></tr></thead><tbody>${filas}</tbody></table>
<div class="total-row"><span class="total-label">Total a liquidar</span><span class="total-amount">${formatMXN(subtotal)}</span></div>${neg}</div>
<div class="section"><p class="section-title">III. Fundamento Legal</p><p style="font-size:13px;color:#57534E;">Artículos 48, 50 fracciones I y II, 66, 67, 68, 76, 80, 87 y 162 de la Ley Federal del Trabajo. La prima de antigüedad se topa a dos salarios mínimos del área geográfica conforme al artículo 162 de la LFT. Los salarios caídos se computan conforme al artículo 48 con un tope de doce meses.</p></div>
<div class="footer"><p>Cálculo referencial generado con LABORIS — ${fechaHoy}.</p><p>Este documento no constituye asesoría legal. Verifique los conceptos y montos antes de presentar ante la autoridad.</p></div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 500); });
    }
  }, [resultado, tipo, fechaIngreso, fechaBaja, sd, areaGeo, nombreTrabajador, nombrePatron, pctNegociacion, totalNegociado]);

  const inputClass = "w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors";
  const labelClass = "block text-sm text-text-secondary mb-1.5";

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Calculadora de liquidaciones</h1>
          <p className="text-text-muted mt-1 text-sm">Finiquitos, indemnizaciones y cuantificación conforme a la LFT</p>
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

      <div className="grid grid-cols-12 gap-6 animate-fade-in animate-fade-in-delay-1">
        {/* LEFT: Inputs */}
        <div className="col-span-5 space-y-5">
          {/* Datos generales */}
          <div className="bg-white rounded-xl border border-border p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-5">Datos de la relación laboral</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Trabajador</label>
                  <input type="text" placeholder="Nombre completo" value={nombreTrabajador} onChange={(e) => setNombreTrabajador(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Patrón / Empresa</label>
                  <input type="text" placeholder="Razón social" value={nombrePatron} onChange={(e) => setNombrePatron(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Causa de separación</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoSeparacion)} className={inputClass}>
                  {Object.entries(tipoLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Salario base diario (MXN) <span className="text-brand">*</span></label>
                <input type="number" min={0} placeholder="Ej: 450" value={salarioDiario === 0 ? "" : salarioDiario} onChange={(e) => setSalarioDiario(e.target.value === "" ? 0 : Number(e.target.value))} className={`${inputClass} tabular-nums`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha de ingreso <span className="text-brand">*</span></label>
                  <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha de separación <span className="text-brand">*</span></label>
                  <input type="date" value={fechaBaja} onChange={(e) => setFechaBaja(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Prestaciones */}
          <div className="bg-white rounded-xl border border-border p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-5">Prestaciones y área geográfica</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Días aguinaldo</label>
                  <input type="number" value={diasAguinaldo} onChange={(e) => setDiasAguinaldo(Number(e.target.value))} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Vacaciones (días)</label>
                  <input type="number" value={diasVacaciones || ""} placeholder="0" onChange={(e) => setDiasVacaciones(Number(e.target.value) || 0)} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Prima vac. (%)</label>
                  <input type="number" value={primaVacPct} onChange={(e) => setPrimaVacPct(Number(e.target.value))} className={`${inputClass} tabular-nums`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Área geográfica (salario mínimo)</label>
                <select value={areaGeo} onChange={(e) => setAreaGeo(e.target.value as AreaGeografica)} className={inputClass}>
                  {Object.entries(SALARIOS_MINIMOS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Horas extra */}
          <div className="bg-white rounded-xl border border-border p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-5">Horas extra reclamadas</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Horas extra / semana</label>
                  <input type="number" min={0} value={horasExtraSemana || ""} placeholder="0" onChange={(e) => setHorasExtraSemana(Number(e.target.value) || 0)} className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Tipo de jornada</label>
                  <select value={tipoJornada} onChange={(e) => setTipoJornada(e.target.value as TipoJornada)} className={inputClass}>
                    {Object.entries(HORAS_JORNADA).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                  </select>
                </div>
              </div>
              {horasExtraSemana > 0 && sd > 0 && (
                <div className="p-3 bg-stone-50 rounded-lg text-xs text-text-secondary space-y-1">
                  <p><span className="font-medium">Dobles:</span> {Math.min(horasExtraSemana, 9)} hrs × 2 = {formatMXNDec(Math.min(horasExtraSemana, 9) * (sd / HORAS_JORNADA[tipoJornada].horas) * 2)}/sem</p>
                  {horasExtraSemana > 9 && (
                    <p><span className="font-medium">Triples:</span> {horasExtraSemana - 9} hrs × 3 = {formatMXNDec((horasExtraSemana - 9) * (sd / HORAS_JORNADA[tipoJornada].horas) * 3)}/sem</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={calcular}
              disabled={!formValid}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] shadow-lg ${
                formValid
                  ? "bg-gradient-to-r from-brand-dark to-brand text-white hover:shadow-xl shadow-brand/25 cursor-pointer"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
              }`}
            >
              <Calculator size={18} />
              {resultado ? "Recalcular liquidación" : "Calcular liquidación"}
            </button>
            {resultado && (
              <button
                onClick={limpiar}
                className="flex items-center justify-center gap-2 px-4 py-3.5 border border-border rounded-xl text-sm text-text-secondary hover:bg-stone-50 transition-colors"
              >
                <RotateCcw size={16} />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="col-span-7 space-y-5" ref={resultRef}>
          {!resultado ? (
            /* Empty state */
            <div className="bg-white rounded-xl border border-border p-12 flex flex-col items-center justify-center min-h-[500px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-5">
                <Calculator size={28} className="text-text-muted" />
              </div>
              <h3 className="font-display text-xl text-text-primary mb-2">
                Ingresa los datos del caso
              </h3>
              <p className="text-sm text-text-muted max-w-sm leading-relaxed">
                Completa el salario diario y las fechas de la relación laboral, luego presiona
                <span className="font-semibold text-brand"> Calcular liquidación</span> para
                obtener el desglose con fundamento legal.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-xs text-text-muted">Campos requeridos</p>
                  <p className="text-lg font-semibold text-text-primary mt-0.5">3</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-xs text-text-muted">Conceptos LFT</p>
                  <p className="text-lg font-semibold text-text-primary mt-0.5">8</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-xs text-text-muted">Incluye</p>
                  <p className="text-lg font-semibold text-text-primary mt-0.5">PDF</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Computed values banner */}
              <div className={`bg-white rounded-xl border border-border p-5 grid grid-cols-4 gap-4 transition-all duration-500 ${flash ? "ring-2 ring-brand/30 bg-brand-50" : ""}`}>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">Antigüedad</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">{resultado.antiguedad.anios}a {resultado.antiguedad.meses}m {resultado.antiguedad.dias}d</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">Factor integración</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">{resultado.factorIntegracion.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">SDI</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5 text-brand">{formatMXNDec(resultado.sdi)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">Tope prima antig.</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">{formatMXNDec(resultado.sm * 2)}</p>
                </div>
              </div>

              {/* Results table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Desglose de la liquidación</h2>
                  <button onClick={generarPDF} className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-stone-50 transition-colors">
                    <Download size={15} />
                    Exportar PDF
                  </button>
                </div>

                <div className={`bg-white rounded-xl border border-border overflow-hidden transition-all duration-500 ${flash ? "ring-2 ring-brand/30" : ""}`}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3">Concepto</th>
                        <th className="text-left text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3">Base de cálculo</th>
                        <th className="text-left text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3">Fundamento</th>
                        <th className="text-right text-[11px] uppercase tracking-wider text-text-muted font-medium px-5 py-3">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.conceptos.map((c, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-stone-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-text-primary">{c.nombre}</td>
                          <td className="px-5 py-3 text-xs text-text-muted">{c.base}</td>
                          <td className="px-5 py-3 text-xs text-text-muted">{c.fundamento}</td>
                          <td className="px-5 py-3 text-sm text-right font-semibold tabular-nums">{formatMXN(c.importe)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-xl p-5 flex items-center justify-between shadow-lg" style={{ background: "linear-gradient(135deg, #8C3420, #C94A2E, #B5432A)" }}>
                  <span className="text-white/90 text-sm font-semibold uppercase tracking-wider">Total a liquidar</span>
                  <span className="text-white text-3xl font-bold tabular-nums">{formatMXN(resultado.subtotal)}</span>
                </div>
              </div>

              {/* Negotiation simulator */}
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-5">
                  <SlidersHorizontal size={16} className="text-brand" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Simulador de negociación</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-light text-brand font-semibold ml-1">INTERACTIVO</span>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-6 mb-5">
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={pctNegociacion}
                      onChange={(e) => setPctNegociacion(Number(e.target.value))}
                      className="w-full h-2 appearance-none rounded-full bg-stone-200 accent-brand cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                      <span>10%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-50 rounded-lg px-3 py-2">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={pctNegociacion}
                      onChange={(e) => setPctNegociacion(Math.min(100, Math.max(10, Number(e.target.value))))}
                      className="w-12 bg-transparent text-sm text-center tabular-nums font-bold focus:outline-none"
                    />
                    <span className="text-sm text-text-muted font-semibold">%</span>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex gap-2 mb-5">
                  {[100, 80, 70, 60, 50].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setPctNegociacion(pct)}
                      className={`px-3.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        pctNegociacion === pct
                          ? "bg-brand text-white shadow-sm"
                          : "bg-stone-100 text-text-secondary hover:bg-stone-200"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="space-y-2.5 mb-6">
                  {resultado.conceptos.map((c, i) => {
                    const maxImporte = Math.max(...resultado.conceptos.map((x) => x.importe));
                    const barFull = maxImporte > 0 ? (c.importe / maxImporte) * 100 : 0;
                    const adjusted = Math.round(c.importe * (pctNegociacion / 100));
                    const barAdj = maxImporte > 0 ? (adjusted / maxImporte) * 100 : 0;

                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-secondary truncate max-w-[220px]">{c.nombre}</span>
                          <div className="flex items-center gap-3 tabular-nums shrink-0">
                            {pctNegociacion < 100 && (
                              <span className="text-text-muted line-through text-[11px]">{formatMXN(c.importe)}</span>
                            )}
                            <span className="font-semibold text-text-primary">{formatMXN(adjusted)}</span>
                          </div>
                        </div>
                        <div className="h-3.5 bg-stone-100 rounded-full overflow-hidden relative">
                          {pctNegociacion < 100 && (
                            <div className="absolute inset-y-0 left-0 bg-stone-200 rounded-full transition-all duration-300 ease-out" style={{ width: `${barFull}%` }} />
                          )}
                          <div className="absolute inset-y-0 left-0 bg-brand rounded-full transition-all duration-300 ease-out" style={{ width: `${barAdj}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Negotiated total */}
                <div className={`flex items-center justify-between p-5 rounded-xl transition-colors ${pctNegociacion < 100 ? "bg-amber-50 border border-amber-200" : "bg-stone-50"}`}>
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total negociado</p>
                    {pctNegociacion < 100 && (
                      <p className="text-xs text-text-muted mt-0.5">
                        Descuento de {formatMXN(resultado.subtotal - totalNegociado)} ({100 - pctNegociacion}% menos)
                      </p>
                    )}
                  </div>
                  <p className={`text-3xl font-bold tabular-nums ${pctNegociacion < 100 ? "text-amber-700" : "text-text-primary"}`}>
                    {formatMXN(totalNegociado)}
                  </p>
                </div>

                <div className="flex items-start gap-2 mt-4 p-3 bg-brand-50 rounded-lg">
                  <Info size={14} className="text-brand shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Mueve el slider o selecciona un porcentaje para simular escenarios de negociación.
                    El PDF incluirá el monto negociado si es diferente al 100%.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
