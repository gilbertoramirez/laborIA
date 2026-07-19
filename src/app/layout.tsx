import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Laboris — Gestión integral para abogados laboralistas",
  description:
    "Plataforma de gestión para despachos de derecho laboral. Liquidaciones, audiencias, documentos, casos y jurisprudencia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="h-full flex">
        <Sidebar />
        <main className="flex-1 ml-64 overflow-y-auto h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
