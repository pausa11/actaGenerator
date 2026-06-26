'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Mic, FolderOpen, Save, Check, ImagePlus, X, Pencil, FileText, Eye, Edit3 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useActaGenerator } from '@/hooks/useActaGenerator';

type Modo = 'audio' | 'texto';
type SubModoTexto = 'archivo' | 'pegar';

function GenerarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');

  const {
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
  } = useActaGenerator();

  const [modo, setModo] = useState<Modo>('audio');
  const [subModoTexto, setSubModoTexto] = useState<SubModoTexto>('pegar');
  const [textoPegado, setTextoPegado] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [imagenes, setImagenes] = useState<{ name: string; dataUrl: string }[]>([]);
  const [modoVista, setModoVista] = useState<'preview' | 'editar'>('preview');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputTextoRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then(r => r.ok ? r.json() : null)
      .then((g: { name: string } | null) => { if (g) setNombreGrupo(g.name); })
      .catch(() => {});
  }, [groupId]);

  useEffect(() => {
    if (estado === 'listo') {
      const now = new Date();
      const ts = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setTitulo(nombreGrupo ? `${nombreGrupo} - ${ts}` : `Acta del ${ts}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (modo === 'texto') procesarArchivoTexto(file);
    else procesarArchivo(file);
  }, [modo, procesarArchivo, procesarArchivoTexto]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setArrastrando(true); };
  const onDragLeave = () => setArrastrando(false);
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };
  const onFileTextoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivoTexto(file);
  };

  async function handleGenerarTexto() {
    if (subModoTexto === 'pegar') {
      await generarActaDesdeTexto(textoPegado, groupId);
    } else if (archivoTexto) {
      const texto = await archivoTexto.text();
      await generarActaDesdeTexto(texto, groupId);
    }
  }

  function resizeImage(file: File, maxPx = 1200, quality = 0.82): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  function onImagenesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(async file => {
      try {
        const dataUrl = await resizeImage(file);
        setImagenes(prev => [...prev, { name: file.name, dataUrl }]);
      } catch {
        // fallback: usar la imagen sin comprimir
        const reader = new FileReader();
        reader.onload = () => {
          setImagenes(prev => [...prev, { name: file.name, dataUrl: reader.result as string }]);
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  }

  function quitarImagen(index: number) {
    setImagenes(prev => prev.filter((_, i) => i !== index));
  }

  function buildImagenesMarkdown(): string {
    if (imagenes.length === 0) return '';
    const lines = ['## Adjuntos', ''];
    imagenes.forEach((img, i) => {
      lines.push(`![${img.name || `Imagen ${i + 1}`}](${img.dataUrl})`);
      lines.push('');
    });
    return lines.join('\n');
  }

  function extractTitle(md: string): string {
    const h1 = md.match(/^#\s+(.+)$/m);
    if (h1) return h1[1].trim();
    const firstLine = md.split('\n').find(l => l.trim());
    return firstLine?.replace(/^#+\s*/, '').trim() || `Acta del ${new Date().toLocaleDateString('es-AR')}`;
  }

  async function guardarActa() {
    if (!markdown || guardando) return;
    setGuardando(true);
    setErrorGuardar('');
    try {
      const title = titulo.trim() || extractTitle(markdown);
      const res = await fetch('/api/actas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, title, content: markdown, modelUsed: modeloUsado }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorGuardar(data.error ?? 'Error al guardar');
        return;
      }
      setGuardado(true);
      if (groupId) {
        setTimeout(() => router.push(`/dashboard/grupos/${groupId}`), 1200);
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10 pb-10">
      <div className="no-print">
        {groupId && nombreGrupo && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-purple-600/15 border border-purple-400/25 rounded-lg">
            <span className="text-purple-400 text-sm">Generando para el grupo:</span>
            <span className="text-white text-sm font-medium">{nombreGrupo}</span>
          </div>
        )}

        <p className="mb-6 font-medium text-white">Sube el audio de tu reunión y obtén el acta en segundos.</p>

        {/* Selector de modo */}
        <div className="flex gap-2 mb-6 p-1 bg-white/10 rounded-xl w-fit">
          <button
            onClick={() => setModo('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === 'audio'
                ? 'bg-purple-600 text-white shadow'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Mic size={15} />
            Desde audio
          </button>
          <button
            onClick={() => setModo('texto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === 'texto'
                ? 'bg-purple-600 text-white shadow'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <FileText size={15} />
            Desde transcripción
          </button>
        </div>

        {modo === 'audio' ? (
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
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac,.webm"
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
        ) : (
          <div>
            {/* Sub-tabs archivo / pegar */}
            <div className="flex gap-1 mb-4 border-b border-white/15">
              <button
                onClick={() => setSubModoTexto('pegar')}
                className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  subModoTexto === 'pegar'
                    ? 'border-purple-400 text-white'
                    : 'border-transparent text-white/50 hover:text-white/70'
                }`}
              >
                Pegar texto
              </button>
              <button
                onClick={() => setSubModoTexto('archivo')}
                className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  subModoTexto === 'archivo'
                    ? 'border-purple-400 text-white'
                    : 'border-transparent text-white/50 hover:text-white/70'
                }`}
              >
                Subir archivo .txt / .md
              </button>
            </div>

            {subModoTexto === 'pegar' ? (
              <textarea
                value={textoPegado}
                onChange={(e) => setTextoPegado(e.target.value)}
                placeholder="Pegá aquí la transcripción de la reunión…"
                rows={10}
                className="w-full px-4 py-3 text-sm bg-white/10 backdrop-blur-xl border border-white/25 text-white placeholder-white/35 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors backdrop-blur-xl ${
                  arrastrando
                    ? 'border-purple-400/70 bg-purple-500/20'
                    : archivoTexto
                    ? 'border-green-400/70 bg-green-500/15'
                    : 'border-white/40 hover:border-white/60 bg-white/15'
                }`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputTextoRef.current?.click()}
              >
                <input
                  ref={inputTextoRef}
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="hidden"
                  onChange={onFileTextoChange}
                />
                {archivoTexto ? (
                  <div>
                    <FileText className="mx-auto mb-2 text-white/70" size={28} />
                    <p className="font-medium text-white">{archivoTexto.name}</p>
                    <p className="text-sm text-white/70 mt-1">
                      {(archivoTexto.size / 1024).toFixed(1)} KB — haz clic para cambiar
                    </p>
                  </div>
                ) : (
                  <div>
                    <FolderOpen className="mx-auto mb-2 text-white/70" size={28} />
                    <p className="text-white font-medium">Arrastra tu transcripción aquí</p>
                    <p className="text-sm text-white/60 mt-1">o haz clic para seleccionar — .txt o .md</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {estado === 'error' && (
          <div className="mt-4 p-4 bg-red-500/15 backdrop-blur-xl border border-red-400/30 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={() => modo === 'audio' ? generarActa(groupId) : handleGenerarTexto()}
          disabled={
            estado === 'cargando' || comprimiendo ||
            (modo === 'audio' && !archivo) ||
            (modo === 'texto' && subModoTexto === 'pegar' && !textoPegado.trim()) ||
            (modo === 'texto' && subModoTexto === 'archivo' && !archivoTexto)
          }
          className="mt-6 w-full py-3 px-6 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {(estado === 'cargando' || comprimiendo) ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {comprimiendo
                ? 'Comprimiendo audio…'
                : modo === 'audio'
                ? 'Procesando audio con Gemini…'
                : 'Generando acta desde transcripción…'}
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

        {modo === 'audio' && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg">
            <span className="text-amber-400 text-sm mt-px">⚠</span>
            <p className="text-xs text-amber-200/80">
              La calidad del acta depende directamente de la calidad del audio. Grabaciones con ruido de fondo, voces superpuestas o baja claridad pueden afectar el resultado.
            </p>
          </div>
        )}
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

          <div className="no-print mb-6 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
            <p className="text-sm font-medium text-white mb-3">Adjuntar imágenes al acta</p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onImagenesChange}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ImagePlus size={15} />
              Agregar imágenes
            </button>
            {imagenes.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {imagenes.map((img, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-white/20">
                    <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => quitarImagen(i)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={13} />
                    </button>
                    <p className="px-1 py-0.5 text-xs text-white/70 truncate bg-black/40">{img.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="no-print mb-4 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Pencil size={14} className="text-purple-400" />
              Título del acta
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título del acta…"
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="no-print flex gap-3 mb-6 flex-wrap">
            <button
              onClick={() => descargarMd(titulo)}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
            >
              Descargar .md
            </button>
            <button
              onClick={() => descargarPDF(buildImagenesMarkdown(), titulo)}
              disabled={descargandoPDF}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {descargandoPDF ? 'Generando PDF…' : 'Exportar PDF'}
            </button>
            {groupId && (
              <button
                onClick={guardarActa}
                disabled={guardando || guardado}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  guardado
                    ? 'bg-green-600/20 border border-green-400/30 text-green-400 cursor-default'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {guardado ? <><Check size={15} /> Guardada</> : <><Save size={15} /> {guardando ? 'Guardando…' : 'Guardar en grupo'}</>}
              </button>
            )}
          </div>

          {errorGuardar && (
            <p className="no-print mb-4 text-sm text-red-300 bg-red-500/15 border border-red-400/25 rounded-lg px-3 py-2">
              {errorGuardar}
            </p>
          )}

          <div className="no-print flex gap-1 mb-3 p-1 bg-white/10 rounded-xl w-fit">
            <button
              onClick={() => setModoVista('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                modoVista === 'preview'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Eye size={14} />
              Vista previa
            </button>
            <button
              onClick={() => setModoVista('editar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                modoVista === 'editar'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Edit3 size={14} />
              Editar
            </button>
          </div>

          {modoVista === 'editar' ? (
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full min-h-[600px] px-5 py-4 text-sm font-mono bg-white text-gray-800 border border-white/20 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
              spellCheck={false}
            />
          ) : (
            <article className="bg-white rounded-xl border border-white/20 p-10 prose prose-gray max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </article>
          )}
        </div>
      )}
    </div>
  );
}

export default function GenerarPage() {
  return (
    <Suspense>
      <GenerarContent />
    </Suspense>
  );
}
