"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Calculator,
  AudioLines,
  FileText,
  Briefcase,
  Scale,
} from "lucide-react";

const modules = [
  { id: "00", label: "Panorama", href: "/", icon: LayoutGrid },
  { id: "01", label: "Liquidaciones", href: "/liquidaciones", icon: Calculator },
  { id: "02", label: "Audiencias", href: "/audiencias", icon: AudioLines },
  { id: "03", label: "Documentos", href: "/documentos", icon: FileText },
  { id: "04", label: "Casos y plazos", href: "/casos", icon: Briefcase },
  { id: "05", label: "Jurisprudencia", href: "/jurisprudencia", icon: Scale },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border flex flex-col z-50">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand rounded-sm" />
          <span className="font-display text-xl tracking-tight text-text-primary">
            LABORIS
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {modules.map((mod) => {
          const isActive =
            mod.href === "/"
              ? pathname === "/"
              : pathname.startsWith(mod.href);
          const Icon = mod.icon;

          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-150
                ${
                  isActive
                    ? "bg-brand-light text-brand font-medium"
                    : "text-text-secondary hover:bg-stone-50 hover:text-text-primary"
                }
              `}
            >
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  isActive ? "text-brand/50" : "text-text-muted"
                }`}
              >
                {mod.id}
              </span>
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className="shrink-0"
              />
              <span className="text-sm">{mod.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-xs font-semibold text-text-secondary">
            MR
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              Lic. M. Reyes
            </p>
            <p className="text-xs text-text-muted truncate">
              Despacho independiente
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
