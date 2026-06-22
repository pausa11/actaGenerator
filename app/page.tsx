import Link from 'next/link';
import { Mic, Zap, FileDown } from 'lucide-react';

const pasos = [
  {
    Icono: Mic,
    numero: '01',
    titulo: 'Grabá el audio',
    descripcion:
      'Usá cualquier grabadora o app de voz en tu teléfono o computadora. Sin equipos especiales ni preparación.',
  },
  {
    Icono: Zap,
    numero: '02',
    titulo: 'La IA lo procesa',
    descripcion:
      'Subís el archivo y nuestra IA transcribe, analiza y estructura toda la reunión en segundos.',
  },
  {
    Icono: FileDown,
    numero: '03',
    titulo: 'Descargá el acta',
    descripcion:
      'Obtenés un PDF profesional, listo para revisar, firmar y archivar. Sin editar una sola línea.',
  },
];

const formatos = ['MP3', 'M4A', 'WAV', 'OGG', 'WEBM', 'AAC'];

const participantes: [string, string][] = [
  ['Ana García', 'Gerente de Producto'],
  ['Carlos Martínez', 'Desarrollador Senior'],
  ['Laura Rodríguez', 'Diseñadora UX'],
  ['Marcos Pérez', 'QA Lead'],
];

const compromisos: [string, string, string][] = [
  ['Integración sistema RRHH', 'Carlos Martínez', '22 jun'],
  ['Diseño pantalla de reportes', 'Laura Rodríguez', '24 jun'],
  ['Suite de tests v2', 'Marcos Pérez', '20 jun'],
];

export default function Landing() {
  return (
    <div className="pb-24">

      {/* ── Hero ── */}
      <section className="min-h-[88vh] flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/25 text-purple-300 text-sm mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
          Impulsado por Gemini AI
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight max-w-4xl">
          Pon atención en tu{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            reunión.
          </span>
          <br />
          El acta la generamos nosotros.
        </h1>

        <p className="mt-6 text-xl text-white/60 max-w-2xl">
          Solo grabá el audio. En segundos tenés tu acta en PDF, estructurada y lista para firmar.
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
        <h2 className="text-3xl font-bold text-white text-center mb-3">Así de simple</h2>
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
            Grabás con el teléfono, la computadora, Teams, Zoom — cualquier fuente sirve.
          </p>
        </div>
      </section>

      {/* ── Vista previa del PDF ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-3">Así queda el acta</h2>
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
                acta-reunion-2025-06-15.pdf
              </span>
            </div>

            {/* Contenido del documento */}
            <div className="p-8 md:p-12 font-serif text-gray-800 text-[13px] leading-relaxed">
              {/* Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Documento oficial</p>
                <h1 className="text-xl font-bold text-gray-900 tracking-wide">ACTA DE REUNIÓN</h1>
                <p className="text-gray-400 text-xs mt-1">Generada automáticamente · Acta Generator</p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8">
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Proyecto</span>
                  <p className="font-semibold text-gray-800">Rediseño Portal Interno</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Lugar</span>
                  <p className="font-semibold text-gray-800">Sala B — Piso 3</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Fecha</span>
                  <p className="font-semibold text-gray-800">15 de junio de 2025</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Duración</span>
                  <p className="font-semibold text-gray-800">10:00 – 11:15 hs</p>
                </div>
              </div>

              {/* Participantes */}
              <div className="mb-7">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
                  Participantes
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {participantes.map(([nombre, rol]) => (
                    <div key={nombre} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                      <span>
                        <strong>{nombre}</strong>{' '}
                        <span className="text-gray-400">— {rol}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temas */}
              <div className="mb-7">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
                  Temas tratados
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-800">1. Avance del sprint actual</p>
                    <p className="text-gray-500 mt-0.5">
                      El módulo de autenticación fue completado y está en revisión. Laura presentó los
                      nuevos wireframes del panel de administración, aprobados por el equipo.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">2. Planificación de próximas entregas</p>
                    <p className="text-gray-500 mt-0.5">
                      Se priorizó la integración con el sistema de RRHH para la semana del 22 de junio.
                      Marcos informó que los tests de regresión están listos para ejecutarse.
                    </p>
                  </div>
                </div>
              </div>

              {/* Compromisos */}
              <div className="mb-7">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
                  Compromisos
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">
                          Tarea
                        </th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">
                          Responsable
                        </th>
                        <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">
                          Fecha límite
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {compromisos.map(([tarea, resp, fecha]) => (
                        <tr key={tarea} className="even:bg-gray-50/60">
                          <td className="px-3 py-2 border border-gray-200">{tarea}</td>
                          <td className="px-3 py-2 border border-gray-200">{resp}</td>
                          <td className="px-3 py-2 border border-gray-200">{fecha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Próxima reunión */}
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3">
                <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wide">
                  Próxima reunión:{' '}
                </span>
                <span className="text-gray-700">
                  22 de junio de 2025, 10:00 hs — Sala B, Piso 3
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">¿Listo para empezar?</h2>
        <p className="text-white/50 mb-8 text-lg">
          Subí tu próximo audio y obtené el acta en segundos.
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
