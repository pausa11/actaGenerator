'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Estado = 'idle' | 'cargando' | 'listo' | 'error';

export default function Home() {
  const [estado, setEstado] = useState<Estado>('idle');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [reemplazar, setReemplazar] = useState('');
  const [ultimoReemplazo, setUltimoReemplazo] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesarArchivo = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('El archivo debe ser de audio (mp3, m4a, wav, etc.)');
      setEstado('error');
      return;
    }
    setArchivo(file);
    setEstado('idle');
    setError('');
    setMarkdown('');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const onDragLeave = () => setArrastrando(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  const generarActa = async () => {
    if (!archivo) return;

    setEstado('cargando');
    setError('');
    setMarkdown('');

    try {
      const form = new FormData();
      form.append('audio', archivo);

      const res = await fetch('/api/generate', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al generar el acta');

      setMarkdown(data.markdown);
      setEstado('listo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setEstado('error');
    }
  };

  const aplicarCorrecion = () => {
    if (!buscar.trim()) return;
    const escapado = buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapado, 'g');
    const coincidencias = (markdown.match(regex) || []).length;
    if (coincidencias > 0) {
      setMarkdown(markdown.replace(regex, reemplazar));
    }
    setUltimoReemplazo(coincidencias);
    setBuscar('');
    setReemplazar('');
  };

  const descargarMd = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acta-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="max-w-4xl mx-auto px-6 pt-28 pb-10">
      <div className="no-print">
        <p className="mb-8 font-medium">Sube el audio de tu reunión y obtén el acta en segundos.</p>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors backdrop-blur-xl ${
            arrastrando
              ? 'border-blue-400/70 bg-blue-500/20'
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
              <Mic className="mx-auto mb-2 text-gray-600" size={28} />
              <p className="font-medium text-gray-800">{archivo.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(archivo.size / 1024 / 1024).toFixed(1)} MB — haz clic para cambiar
              </p>
            </div>
          ) : (
            <div>
              <FolderOpen className="mx-auto mb-2 text-gray-400" size={28} />
              <p className="text-gray-600 font-medium">Arrastra tu audio aquí</p>
              <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar — mp3, m4a, wav, ogg</p>
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
          className="mt-6 w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>

      {estado === 'listo' && markdown && (
        <div>
          <div className="no-print mt-10 mb-4 p-4 bg-white/15 backdrop-blur-xl border border-white/30 rounded-xl">
            <p className="text-sm font-medium text-gray-700 mb-3">Corregir texto transcripto</p>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Buscar…"
                value={buscar}
                onChange={(e) => { setBuscar(e.target.value); setUltimoReemplazo(null); }}
                onKeyDown={(e) => e.key === 'Enter' && aplicarCorrecion()}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="text"
                placeholder="Reemplazar por…"
                value={reemplazar}
                onChange={(e) => { setReemplazar(e.target.value); setUltimoReemplazo(null); }}
                onKeyDown={(e) => e.key === 'Enter' && aplicarCorrecion()}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={aplicarCorrecion}
                disabled={!buscar.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Exportar PDF
            </button>
          </div>

          <article className="bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 p-10 prose prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}
