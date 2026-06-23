'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useActaGenerator } from '@/hooks/useActaGenerator';

export default function GenerarPage() {
  const {
    estado,
    markdown,
    error,
    archivo,
    buscar,
    setBuscar,
    reemplazar,
    setReemplazar,
    ultimoReemplazo,
    descargandoPDF,
    modeloUsado,
    procesarArchivo,
    generarActa,
    aplicarCorrecion,
    descargarPDF,
    descargarMd,
  } = useActaGenerator();

  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
  }, [procesarArchivo]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const onDragLeave = () => setArrastrando(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10 pb-10">
      <div className="no-print">
        <p className="mb-8 font-medium text-white">Sube el audio de tu reunión y obtén el acta en segundos.</p>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors backdrop-blur-xl ${
            arrastrando
              ? 'border-purple-400/70 bg-purple-500/20'
              : archivo
              ? 'border-green-400/70 bg-green-500/15'
              : 'border-white/40 hover:border-white/60 bg-white/15'
          }`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onFileChange}
          />

          {archivo ? (
            <div>
              <Mic className="mx-auto mb-2 text-white/70" size={28} />
              <p className="font-medium text-white">{archivo.name}</p>
              <p className="text-sm text-white/70 mt-1">
                {(archivo.size / 1024 / 1024).toFixed(1)} MB — haz clic para cambiar
              </p>
            </div>
          ) : (
            <div>
              <FolderOpen className="mx-auto mb-2 text-white/70" size={28} />
              <p className="text-white font-medium">Arrastra tu audio aquí</p>
              <p className="text-sm text-white/60 mt-1">o haz clic para seleccionar — mp3, m4a, wav, ogg</p>
            </div>
          )}
        </div>

        {estado === 'error' && (
          <div className="mt-4 p-4 bg-red-500/15 backdrop-blur-xl border border-red-400/30 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={generarActa}
          disabled={!archivo || estado === 'cargando'}
          className="mt-6 w-full py-3 px-6 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {estado === 'cargando' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Procesando audio con Gemini…
            </span>
          ) : (
            'Generar acta'
          )}
        </button>

        {estado === 'listo' && modeloUsado && (
          <p className="mt-3 text-xs text-white/50 text-center">
            Acta generada con <span className="font-mono text-white/70">{modeloUsado}</span>
          </p>
        )}

        <div className="mt-4 flex items-start gap-2 p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg">
          <span className="text-amber-400 text-sm mt-px">⚠</span>
          <p className="text-xs text-amber-200/80">
            La calidad del acta depende directamente de la calidad del audio. Grabaciones con ruido de fondo, voces superpuestas o baja claridad pueden afectar el resultado.
          </p>
        </div>
      </div>

      {estado === 'listo' && markdown && (
        <div>
          <div className="no-print mt-10 mb-4 p-4 bg-white/15 backdrop-blur-xl border border-white/30 rounded-xl">
            <p className="text-sm font-medium text-white mb-3">Corregir texto transcripto</p>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Buscar…"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aplicarCorrecion()}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="text"
                placeholder="Reemplazar por…"
                value={reemplazar}
                onChange={(e) => setReemplazar(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aplicarCorrecion()}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={aplicarCorrecion}
                disabled={!buscar.trim()}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Reemplazar todo
              </button>
            </div>
            {ultimoReemplazo !== null && (
              <p className={`text-xs mt-2 ${ultimoReemplazo > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {ultimoReemplazo > 0
                  ? `${ultimoReemplazo} reemplazo${ultimoReemplazo !== 1 ? 's' : ''} realizado${ultimoReemplazo !== 1 ? 's' : ''}.`
                  : 'No se encontró el texto a buscar.'}
              </p>
            )}
          </div>

          <div className="no-print flex gap-3 mb-6">
            <button
              onClick={descargarMd}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
            >
              Descargar .md
            </button>
            <button
              onClick={descargarPDF}
              disabled={descargandoPDF}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {descargandoPDF ? 'Generando PDF…' : 'Exportar PDF'}
            </button>
          </div>

          <article className="bg-white rounded-xl border border-white/20 p-10 prose prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}
