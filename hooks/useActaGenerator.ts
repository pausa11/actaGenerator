'use client';

import { useState, useCallback } from 'react';

export type Estado = 'idle' | 'cargando' | 'listo' | 'error';

export function useActaGenerator() {
  const [estado, setEstado] = useState<Estado>('idle');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [buscar, setBuscarRaw] = useState('');
  const [reemplazar, setReemplazarRaw] = useState('');
  const [ultimoReemplazo, setUltimoReemplazo] = useState<number | null>(null);
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [modeloUsado, setModeloUsado] = useState('');

  const setBuscar = useCallback((v: string) => {
    setBuscarRaw(v);
    setUltimoReemplazo(null);
  }, []);

  const setReemplazar = useCallback((v: string) => {
    setReemplazarRaw(v);
    setUltimoReemplazo(null);
  }, []);

  const procesarArchivo = useCallback((file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('El archivo debe ser de audio (mp3, m4a, wav, etc.)');
      setEstado('error');
      return;
    }
    setArchivo(file);
    setEstado('idle');
    setError('');
    setMarkdown('');
  }, []);

  const generarActa = async (groupId?: string | null) => {
    if (!archivo) return;

    setEstado('cargando');
    setError('');
    setMarkdown('');
    setModeloUsado('');

    try {
      const form = new FormData();
      form.append('audio', archivo);
      if (groupId) form.append('groupId', groupId);

      const res = await fetch('/api/generate', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al generar el acta');

      setMarkdown(data.markdown);
      setModeloUsado(data.model ?? '');
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
      setMarkdown(prev => prev.replace(regex, reemplazar));
    }
    setUltimoReemplazo(coincidencias);
    setBuscarRaw('');
    setReemplazarRaw('');
  };

  const descargarPDF = async (extraMarkdown = '', titulo = '') => {
    setDescargandoPDF(true);
    try {
      const contenido = extraMarkdown ? `${markdown}\n\n${extraMarkdown}` : markdown;
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: contenido }),
      });
      if (!res.ok) throw new Error('Error al generar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nombre = titulo.trim()
        ? titulo.trim().replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_')
        : `acta-${new Date().toISOString().split('T')[0]}`;
      a.download = `${nombre}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar PDF');
      setEstado('error');
    } finally {
      setDescargandoPDF(false);
    }
  };

  const descargarMd = (titulo = '') => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nombre = titulo.trim()
      ? titulo.trim().replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_')
      : `acta-${new Date().toISOString().split('T')[0]}`;
    a.download = `${nombre}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
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
  };
}
