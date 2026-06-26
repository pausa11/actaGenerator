'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg: FFmpegClass } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  ffmpegInstance = new FFmpegClass();
  const base = '/ffmpeg';
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpegInstance;
}

async function comprimirAudio(file: File): Promise<File> {
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = await getFFmpeg();
  const ext = file.name.split('.').pop() ?? 'mp3';
  const inputName = `input.${ext}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec(['-i', inputName, '-ac', '1', '-b:a', '64k', '-f', 'mp3', 'output.mp3']);
  const data = await ffmpeg.readFile('output.mp3');
  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile('output.mp3').catch(() => {});
  const uint8 = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data.buffer as ArrayBuffer);
  return new File([uint8], 'audio-comprimido.mp3', { type: 'audio/mpeg' });
}

export type Estado = 'idle' | 'cargando' | 'listo' | 'error';

export function useActaGenerator() {
  const [estado, setEstado] = useState<Estado>('idle');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoTexto, setArchivoTexto] = useState<File | null>(null);
  const [buscar, setBuscarRaw] = useState('');
  const [reemplazar, setReemplazarRaw] = useState('');
  const [ultimoReemplazo, setUltimoReemplazo] = useState<number | null>(null);
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [modeloUsado, setModeloUsado] = useState('');
  const [comprimiendo, setComprimiendo] = useState(false);

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

  const procesarArchivoTexto = useCallback((file: File) => {
    const esTexto =
      file.type === 'text/plain' ||
      file.type === 'text/markdown' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md');
    if (!esTexto) {
      setError('El archivo debe ser un archivo de texto (.txt o .md)');
      setEstado('error');
      return;
    }
    setArchivoTexto(file);
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

    let audioPath: string | null = null;

    try {
      setComprimiendo(true);
      let archivoASubir = archivo;
      try {
        archivoASubir = await comprimirAudio(archivo);
      } catch (e) {
        console.warn('Compresión falló, usando archivo original:', e);
        archivoASubir = archivo;
      } finally {
        setComprimiendo(false);
      }

      const supabase = createClient();
      const ext = archivoASubir.name.split('.').pop() ?? 'mp3';
      audioPath = `audio-temp/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-uploads')
        .upload(audioPath, archivoASubir, { contentType: archivoASubir.type, upsert: false });

      if (uploadError) throw new Error(`Error subiendo audio: ${uploadError.message}`);

      const { data: signedData, error: signedError } = await supabase.storage
        .from('audio-uploads')
        .createSignedUrl(audioPath, 7200);

      if (signedError || !signedData?.signedUrl) throw new Error('Error generando URL de audio');

      const form = new FormData();
      form.append('audioUrl', signedData.signedUrl);
      form.append('audioPath', audioPath);
      form.append('audioName', archivo.name);
      form.append('audioType', archivoASubir.type || 'audio/mpeg');
      if (groupId) form.append('groupId', groupId);

      const res = await fetch('/api/generate', { method: 'POST', body: form });

      let data: { error?: string; markdown?: string; model?: string };
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error del servidor (${res.status})`);
      }

      if (!res.ok) throw new Error(data.error || 'Error al generar el acta');

      setMarkdown(data.markdown ?? '');
      setModeloUsado(data.model ?? '');
      setEstado('listo');
    } catch (err) {
      setComprimiendo(false);
      if (audioPath) {
        const supabase = createClient();
        supabase.storage.from('audio-uploads').remove([audioPath]).catch(() => {});
      }
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setEstado('error');
    }
  };

  const generarActaDesdeTexto = async (transcripcion: string, groupId?: string | null) => {
    if (!transcripcion.trim()) return;

    setEstado('cargando');
    setError('');
    setMarkdown('');
    setModeloUsado('');

    try {
      const res = await fetch('/api/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcripcion, groupId: groupId ?? undefined }),
      });
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
    setMarkdown,
    error,
    archivo,
    archivoTexto,
    buscar,
    setBuscar,
    reemplazar,
    setReemplazar,
    ultimoReemplazo,
    descargandoPDF,
    modeloUsado,
    comprimiendo,
    procesarArchivo,
    procesarArchivoTexto,
    generarActa,
    generarActaDesdeTexto,
    aplicarCorrecion,
    descargarPDF,
    descargarMd,
  };
}
