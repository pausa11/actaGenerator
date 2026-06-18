'use client';

import { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Estado = 'idle' | 'cargando' | 'listo' | 'error';

export default function Home() {
  const [estado, setEstado] = useState<Estado>('idle');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
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

  const descargarMd = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acta-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const imprimirPdf = () => window.print();

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Acta Generator</h1>
        <p className="text-gray-500 mb-8">Sube el audio de tu reunión y obtén el acta en segundos.</p>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            arrastrando
              ? 'border-blue-500 bg-blue-50'
              : archivo
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-gray-400 bg-white'
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
              <p className="text-2xl mb-2">🎙️</p>
              <p className="font-medium text-gray-800">{archivo.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(archivo.size / 1024 / 1024).toFixed(1)} MB — haz clic para cambiar
              </p>
            </div>
          ) : (
            <div>
              <p className="text-2xl mb-2">📁</p>
              <p className="text-gray-600 font-medium">Arrastra tu audio aquí</p>
              <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar — mp3, m4a, wav, ogg</p>
            </div>
          )}
        </div>

        {estado === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
          <div className="no-print flex gap-3 mt-10 mb-6">
            <button
              onClick={descargarMd}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
            >
              Descargar .md
            </button>
            <button
              onClick={imprimirPdf}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Exportar PDF
            </button>
          </div>

          <article className="bg-white rounded-xl border border-gray-200 p-10 prose prose-gray max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}
