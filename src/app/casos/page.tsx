"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Plus, X } from "lucide-react";

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

const casosIniciales: Caso[] = [
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

function formatFechaCorta(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
}

function calcDiasPlazo(fechaStr: string): number {
  if (!fechaStr) return 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaStr + "T12:00:00");
  fecha.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((fecha.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000)));
}

const emptyForm = {
  cliente: "",
  materia: "",
  etapa: "Conciliación" as Etapa,
  plazoLabel: "",
  plazoFecha: "",
  cuantia: "",
};

export default function CasosPage() {
  return (
    <Suspense>
      <Casos />
    </Suspense>
  );
}

function Casos() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [casos, setCasos] = useState<Caso[]>(casosIniciales);
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get("nuevo") === "1") {
      setForm(emptyForm);
      setFormError("");
      setDrawerOpen(true);
      router.replace("/casos", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (drawerOpen) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") setDrawerOpen(false);
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [drawerOpen]);

  function handleSubmit() {
    if (!form.cliente || !form.materia || !form.plazoLabel || !form.plazoFecha) {
      setFormError("Completa todos los campos requeridos.");
      return;
    }
    const cuantiaNum = parseFloat(form.cuantia) || 0;
    const diasPlazo = calcDiasPlazo(form.plazoFecha);
    const nuevo: Caso = {
      cliente: form.cliente,
      materia: form.materia,
      etapa: form.etapa,
      proximoPlazo: form.plazoLabel.length > 18 ? form.plazoLabel.slice(0, 18).trim() + "." : form.plazoLabel,
      diasPlazo,
      cuantia: cuantiaNum,
      plazoLabel: form.plazoLabel,
      plazoFecha: formatFechaCorta(form.plazoFecha),
    };
    setCasos((prev) => [nuevo, ...prev]);
    setForm(emptyForm);
    setFormError("");
    setDrawerOpen(false);
  }

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
          <button
            onClick={() => { setForm(emptyForm); setFormError(""); setDrawerOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors active:scale-[0.98]"
          >
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

      {/* Drawer overlay + panel */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            className="relative w-full max-w-md bg-white shadow-2xl border-l border-border flex flex-col animate-slide-in-right"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-display text-xl text-text-primary">Nuevo caso</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-text-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Cliente vs. Contraparte <span className="text-brand">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: López Herrera vs. Grupo Ferro"
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  Materia <span className="text-brand">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Despido injustificado"
                  value={form.materia}
                  onChange={(e) => setForm({ ...form, materia: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Etapa</label>
                  <select
                    value={form.etapa}
                    onChange={(e) => setForm({ ...form, etapa: e.target.value as Etapa })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                  >
                    <option value="Conciliación">Conciliación</option>
                    <option value="Instrucción">Instrucción</option>
                    <option value="Juicio">Juicio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Cuantía (MXN)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 250000"
                    value={form.cuantia}
                    onChange={(e) => setForm({ ...form, cuantia: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors tabular-nums"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">Próximo plazo</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">
                      Descripción del plazo <span className="text-brand">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Audiencia preliminar"
                      value={form.plazoLabel}
                      onChange={(e) => setForm({ ...form, plazoLabel: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">
                      Fecha del plazo <span className="text-brand">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.plazoFecha}
                      onChange={(e) => setForm({ ...form, plazoFecha: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                    />
                    {form.plazoFecha && (
                      <p className="text-xs text-text-muted mt-1.5">
                        {formatFechaCorta(form.plazoFecha)} &middot; {calcDiasPlazo(form.plazoFecha)} días restantes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-border space-y-3">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{formError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-dark to-brand text-white hover:shadow-lg shadow-brand/25 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Guardar caso
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-5 py-3 border border-border rounded-xl text-sm text-text-secondary hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
