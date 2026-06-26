'use client';

import Link from 'next/link';
import { Mic, Zap, FileDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SplitText from '@/components/SplitText';

const pasos = [
  {
    Icono: Mic,
    numero: '01',
    titulo: 'Graba el audio',
    descripcion:
      'Usa cualquier grabadora o app de voz en tu teléfono o computadora. Sin equipos especiales ni preparación.',
  },
  {
    Icono: Zap,
    numero: '02',
    titulo: 'La IA lo procesa',
    descripcion:
      'Sube el archivo y nuestra IA transcribe, analiza y estructura toda la reunión en segundos.',
  },
  {
    Icono: FileDown,
    numero: '03',
    titulo: 'Descarga el acta',
    descripcion:
      'Obtienes un PDF profesional, listo para revisar, firmar y archivar. Sin editar una sola línea.',
  },
];

const formatos = ['MP3', 'M4A', 'WAV', 'OGG', 'WEBM', 'AAC'];

const actaContent = `# Acta de Reunión — Primera Sesión FoodOriginBio
**Fecha:** viernes 29 de mayo 2026
**Participantes:** Paula (fundadora / dirección estratégica), Dana (marketing y diseño), Daniel (tecnología / automatización)

---

## 1. Contexto del Negocio

**FoodOriginBio** es un marketplace B2B orientado a la exportación e importación de productos naturales de origen colombiano, con proyección de expansión a Argentina y otros países.

**Productos iniciales:**
- Café del Eje Cafetero

---

## 2. Estado Actual del Marketplace

- Existe una página web en borrador con secciones de exportación e importación.

---

## 3. Proceso de Cotización Actual (Manual — 7 Pasos)

| # | Paso | Descripción |
|---|------|-------------|
| 1 | Presentación del cliente | Cantidad requerida, país destino, tipo de producto, requerimientos de marca blanca. |

---

## 4. Compromisos y Próximos Pasos

| Responsable | Tarea | Plazo |
|-------------|-------|-------|
| **Dana** | Documentar el proceso de cotización manual en Word. | Antes de próxima reunión |

---

*Reunión catalogada como productiva por todos los participantes. Próximo encuentro pendiente de confirmar.*`;

export default function Landing() {

  return (
    <div className="pb-24">

      {/* ── Hero ── */}
      <section className="min-h-[88vh] flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/25 text-purple-300 text-sm mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
          Impulsado por Gemini AI
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight max-w-4xl text-center">
          <SplitText
            text="Pon atención en tu"
            tag="span"
            delay={35}
            textAlign="center"
          />{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent inline-block align-top">
            reunión.
          </span>
          <br />
          <SplitText
            text="El acta la generamos nosotros."
            tag="span"
            delay={35}
            textAlign="center"
          />
        </h1>

        <p className="mt-6 text-xl text-white/60 max-w-2xl">
          Solo graba el audio. En segundos tenés tu acta en PDF, estructurada y lista para firmar.
        </p>

        <Link
          href="/generar"
          className="mt-10 inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          Generar mi primera acta
          <span aria-hidden>→</span>
        </Link>

        <p className="mt-4 text-white/30 text-sm">Sin registro requerido para empezar.</p>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-3">
          <SplitText tag="h2" text="Así de simple" className="text-3xl font-bold text-white" textAlign="center" />
        </div>
        <p className="text-white/50 text-center mb-12">Tres pasos y tu acta está lista.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {pasos.map(({ Icono, numero, titulo, descripcion }) => (
            <div
              key={numero}
              className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
            >
              <span className="text-6xl font-black text-white/5 absolute top-4 right-5 select-none leading-none">
                {numero}
              </span>
              <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-400/20 flex items-center justify-center mb-4">
                <Icono size={20} className="text-purple-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{titulo}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Formatos de audio ── */}
      <section className="px-6 py-12 max-w-5xl mx-auto">
        <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-6">
            Formatos de audio soportados
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {formatos.map((ext) => (
              <span
                key={ext}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-white font-mono font-medium text-sm"
              >
                .{ext.toLowerCase()}
              </span>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-6">
            Graba con el teléfono, la computadora, Teams, Zoom. Cualquier fuente sirve.
          </p>
        </div>
      </section>

      {/* ── Vista previa del PDF ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-3">
          <SplitText tag="h2" text="Así queda el acta" className="text-3xl font-bold text-white" textAlign="center" />
        </div>
        <p className="text-white/50 text-center mb-12">
          Un documento profesional, estructurado y listo para usar.
        </p>

        <div className="relative">
          <div className="absolute -inset-6 bg-purple-500/10 blur-3xl rounded-3xl pointer-events-none" />

          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl mx-auto">
            {/* Barra superior estilo PDF */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-gray-400 font-mono">
                acta1.md — FoodOriginBio
              </span>
            </div>

            {/* Contenido del documento */}
            <div className="p-8 md:p-12">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm prose-gray max-w-none"
              >
                {actaContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 py-20 text-center">
        <SplitText tag="h2" text="¿Listo para empezar?" className="text-4xl font-bold text-white mb-4" textAlign="center" />
        <p className="text-white/50 mb-8 text-lg">
          Sube tu próximo audio y obten el acta en segundos.
        </p>
        <Link
          href="/generar"
          className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          Generar acta ahora
          <span aria-hidden>→</span>
        </Link>
      </section>
    </div>
  );
}
