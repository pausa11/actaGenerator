'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, FileText, Clock, Settings2, X, Download, FileDown, ImagePlus, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/client';

type ActaListItem = {
  id: string;
  title: string;
  modelUsed: string | null;
  status: 'draft' | 'final';
  createdAt: string;
};

type Acta = ActaListItem & { content: string };

type Group = {
  id: string;
  name: string;
  description: string | null;
  context: string | null;
};

type ActaImage = {
  id: string;
  actaId: string;
  url: string;
  name: string | null;
  position: number | null;
  createdAt: string;
};

type ModalTab = 'contenido' | 'imagenes';

export default function GroupDetail({
  initialGroup,
  initialActas,
}: {
  initialGroup: Group;
  initialActas: ActaListItem[];
}) {
  const router = useRouter();
  const groupId = initialGroup.id;

  const [grupo, setGrupo] = useState<Group>(initialGroup);
  const [actas, setActas] = useState<ActaListItem[]>(initialActas);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [descargandoPDFId, setDescargandoPDFId] = useState<string | null>(null);
  const [descargandoPDFModal, setDescargandoPDFModal] = useState(false);
  const [incluirImagenesPDF, setIncluirImagenesPDF] = useState(true);
  const [actaDetalle, setActaDetalle] = useState<Acta | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [mostrarContexto, setMostrarContexto] = useState(false);
  const [contextoEdit, setContextoEdit] = useState('');
  const [guardandoContexto, setGuardandoContexto] = useState(false);

  const [modalTab, setModalTab] = useState<ModalTab>('contenido');
  const [imagenes, setImagenes] = useState<ActaImage[]>([]);
  const [cargandoImagenes, setCargandoImagenes] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [eliminandoImagenId, setEliminandoImagenId] = useState<string | null>(null);
  const [imagenAmpliada, setImagenAmpliada] = useState<ActaImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actaModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = actaModalRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', handler, { passive: true });
    return () => el.removeEventListener('wheel', handler);
  }, [actaDetalle]);

  async function abrirDetalle(item: ActaListItem) {
    setActaDetalle(null);
    setCargandoDetalle(true);
    setModalTab('contenido');
    setImagenes([]);
    setCargandoImagenes(true);
    try {
      const [actaRes, imgsRes] = await Promise.all([
        fetch(`/api/actas/${item.id}`),
        fetch(`/api/actas/${item.id}/images`),
      ]);
      if (actaRes.ok) setActaDetalle(await actaRes.json());
      if (imgsRes.ok) setImagenes(await imgsRes.json());
    } finally {
      setCargandoDetalle(false);
      setCargandoImagenes(false);
    }
  }

  async function guardarContexto() {
    setGuardandoContexto(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: contextoEdit }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGrupo(prev => ({ ...prev, context: updated.context }));
        setMostrarContexto(false);
      }
    } finally {
      setGuardandoContexto(false);
    }
  }

  async function eliminarActa(id: string) {
    setEliminando(id);
    try {
      const res = await fetch(`/api/actas/${id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setActas(prev => prev.filter(a => a.id !== id));
      if (actaDetalle?.id === id) setActaDetalle(null);
    } finally {
      setEliminando(null);
    }
  }

  async function subirImagen(file: File) {
    if (!actaDetalle) return;
    setSubiendoImagen(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const storagePath = `${actaDetalle.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('acta-images')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        console.error('Error al subir imagen:', uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('acta-images').getPublicUrl(storagePath);

      const res = await fetch(`/api/actas/${actaDetalle.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl, name: file.name }),
      });
      if (res.ok) {
        const nueva: ActaImage = await res.json();
        setImagenes(prev => [...prev, nueva]);
      }
    } finally {
      setSubiendoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function eliminarImagen(imagen: ActaImage) {
    if (!actaDetalle) return;
    setEliminandoImagenId(imagen.id);
    try {
      const supabase = createClient();
      const parsedUrl = new URL(imagen.url);
      const storagePath = parsedUrl.pathname.replace('/storage/v1/object/public/acta-images/', '');
      await supabase.storage.from('acta-images').remove([storagePath]);

      await fetch(`/api/actas/${actaDetalle.id}/images?imageId=${imagen.id}`, { method: 'DELETE' });
      setImagenes(prev => prev.filter(i => i.id !== imagen.id));
      if (imagenAmpliada?.id === imagen.id) setImagenAmpliada(null);
    } finally {
      setEliminandoImagenId(null);
    }
  }

  async function fetchContent(id: string): Promise<string | null> {
    const res = await fetch(`/api/actas/${id}`);
    if (!res.ok) return null;
    const data: Acta = await res.json();
    return data.content;
  }

  function sanitizarNombre(titulo: string) {
    return titulo.trim()
      ? titulo.trim().replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_')
      : `acta-${new Date().toISOString().split('T')[0]}`;
  }

  async function descargarPDF(content: string, title: string, actaId?: string, imagesParam?: ActaImage[]) {
    if (actaId) setDescargandoPDFId(actaId); else setDescargandoPDFModal(true);
    try {
      let images: ActaImage[] = imagesParam ?? [];
      if (actaId && imagesParam === undefined) {
        const imgRes = await fetch(`/api/actas/${actaId}/images`);
        if (imgRes.ok) images = await imgRes.json();
      }
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: content, images }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizarNombre(title)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      if (actaId) setDescargandoPDFId(null); else setDescargandoPDFModal(false);
    }
  }

  function descargarMd(content: string, title: string) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizarNombre(title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12 pb-20">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a grupos
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{grupo.name}</h1>
            {grupo.description && (
              <p className="text-white/50 text-sm mt-1">{grupo.description}</p>
            )}
            {grupo.context && (
              <p className="text-purple-400/70 text-xs mt-1 flex items-center gap-1">
                <Settings2 size={11} />
                Contexto personalizado activo
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setContextoEdit(grupo.context ?? ''); setMostrarContexto(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-white/8 hover:bg-white/15 border border-white/15 text-white/60 hover:text-white text-sm rounded-xl transition-colors"
              title="Configurar contexto del grupo"
            >
              <Settings2 size={15} />
              Contexto
            </button>
            <button
              onClick={() => router.push(`/generar?groupId=${groupId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} />
              Generar acta
            </button>
          </div>
        </div>

        {/* Modal contexto */}
        {mostrarContexto && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-[#0f0a1e] border border-white/15 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Contexto del grupo</h2>
                  <p className="text-white/40 text-xs mt-0.5">Gemini usará estas instrucciones al generar cada acta.</p>
                </div>
                <button onClick={() => setMostrarContexto(false)} className="text-white/40 hover:text-white/70 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <textarea
                autoFocus
                rows={8}
                value={contextoEdit}
                onChange={(e) => setContextoEdit(e.target.value)}
                placeholder={`Ej:\n- Los participantes son del equipo de ventas de ACME Corp.\n- Usar tono formal y evitar abreviaturas.\n- El moderador siempre es Juan García.\n- Priorizar las decisiones comerciales sobre los temas técnicos.`}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/15 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setMostrarContexto(false)}
                  className="flex-1 py-2 border border-white/15 text-white/60 hover:text-white text-sm rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarContexto}
                  disabled={guardandoContexto}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {guardandoContexto ? 'Guardando…' : 'Guardar contexto'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {actas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <FileText size={28} className="text-white/30" />
          </div>
          <p className="text-white/50 text-sm">Este grupo todavía no tiene actas.</p>
          <button
            onClick={() => router.push(`/generar?groupId=${groupId}`)}
            className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Generar la primera acta →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {actas.map((acta) => (
            <div
              key={acta.id}
              className="relative group flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              onClick={() => abrirDetalle(acta)}
            >
              <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText size={16} className="text-purple-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm leading-snug truncate">{acta.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-white/35">
                    <Clock size={11} />
                    {formatFecha(acta.createdAt)}
                  </span>
                  {acta.modelUsed && (
                    <span className="text-xs text-white/25 font-mono">{acta.modelUsed}</span>
                  )}
                </div>
              </div>

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 flex-shrink-0 transition-opacity">
                <label
                  className="flex items-center gap-1 cursor-pointer select-none text-white/35 hover:text-white/60 text-xs transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Adjuntar imágenes al exportar PDF"
                >
                  <input
                    type="checkbox"
                    checked={incluirImagenesPDF}
                    onChange={(e) => setIncluirImagenesPDF(e.target.checked)}
                    className="w-3 h-3 accent-purple-500 cursor-pointer"
                  />
                  Imgs
                </label>
                <button
                  onClick={async (e) => { e.stopPropagation(); const c = await fetchContent(acta.id); if (c) descargarMd(c, acta.title); }}
                  className="p-1.5 rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  title="Descargar .md"
                >
                  <FileDown size={15} />
                </button>
                <button
                  onClick={async (e) => { e.stopPropagation(); const c = await fetchContent(acta.id); if (c) descargarPDF(c, acta.title, acta.id, incluirImagenesPDF ? undefined : []); }}
                  disabled={descargandoPDFId === acta.id}
                  className="p-1.5 rounded-lg text-white/30 hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-40"
                  title="Exportar PDF"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); eliminarActa(acta.id); }}
                  disabled={eliminando === acta.id}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  title="Eliminar acta"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalle acta */}
      {(actaDetalle || cargandoDetalle) && (
        <div
          ref={actaModalRef}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-[#0f0a1e] border border-white/15 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-base font-semibold text-white truncate pr-4">
                {actaDetalle?.title ?? '…'}
              </h2>
              <div className="flex items-center gap-4 flex-shrink-0">
                {modalTab === 'contenido' && actaDetalle && (
                  <>
                    <button
                      onClick={() => descargarMd(actaDetalle.content, actaDetalle.title)}
                      className="text-white/40 hover:text-blue-400 text-sm transition-colors"
                    >
                      Descargar .md
                    </button>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-white/40 hover:text-white/60 text-sm transition-colors">
                      <input
                        type="checkbox"
                        checked={incluirImagenesPDF}
                        onChange={(e) => setIncluirImagenesPDF(e.target.checked)}
                        className="w-3.5 h-3.5 accent-purple-500 cursor-pointer"
                      />
                      Adjuntar imágenes
                    </label>
                    <button
                      onClick={() => descargarPDF(actaDetalle.content, actaDetalle.title, actaDetalle.id, incluirImagenesPDF ? imagenes : [])}
                      disabled={descargandoPDFModal}
                      className="text-purple-400 hover:text-purple-300 text-sm transition-colors disabled:opacity-50"
                    >
                      {descargandoPDFModal ? 'Generando…' : 'Exportar PDF'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setActaDetalle(null); setCargandoDetalle(false); }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 px-6">
              <button
                onClick={() => setModalTab('contenido')}
                className={`flex items-center gap-1.5 py-3 pr-4 text-sm font-medium border-b-2 transition-colors ${
                  modalTab === 'contenido'
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <FileText size={14} />
                Contenido
              </button>
              <button
                onClick={() => setModalTab('imagenes')}
                className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  modalTab === 'imagenes'
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <ImageIcon size={14} />
                Imágenes
                {imagenes.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-600/30 text-purple-300 rounded-full">
                    {imagenes.length}
                  </span>
                )}
              </button>
            </div>

            {modalTab === 'contenido' ? (
              <div className="p-6">
                {cargandoDetalle || !actaDetalle ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                  </div>
                ) : (
                  <article className="bg-white rounded-xl p-8 prose prose-gray max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{actaDetalle.content}</ReactMarkdown>
                  </article>
                )}
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/50 text-sm">
                    {imagenes.length === 0 ? 'Sin imágenes adjuntas' : `${imagenes.length} imagen${imagenes.length !== 1 ? 'es' : ''}`}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) subirImagen(file);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendoImagen}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {subiendoImagen ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Subiendo…
                      </>
                    ) : (
                      <>
                        <ImagePlus size={15} />
                        Adjuntar imagen
                      </>
                    )}
                  </button>
                </div>

                {cargandoImagenes ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                  </div>
                ) : imagenes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                      <ImageIcon size={22} className="text-white/25" />
                    </div>
                    <p className="text-white/40 text-sm">Todavía no hay imágenes.</p>
                    <p className="text-white/25 text-xs mt-1">Hacé clic en "Adjuntar imagen" para agregar una.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imagenes.map((img) => (
                      <div
                        key={img.id}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer"
                        onClick={() => setImagenAmpliada(img)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.name ?? 'Imagen adjunta'}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); eliminarImagen(img); }}
                            disabled={eliminandoImagenId === img.id}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all disabled:opacity-40"
                            title="Eliminar imagen"
                          >
                            {eliminandoImagenId === img.id
                              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                        {img.name && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs truncate">{img.name}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox imagen ampliada */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4"
          onClick={() => setImagenAmpliada(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => setImagenAmpliada(null)}
          >
            <X size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenAmpliada.url}
            alt={imagenAmpliada.name ?? 'Imagen ampliada'}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {imagenAmpliada.name && (
            <p className="absolute bottom-6 text-white/60 text-sm">{imagenAmpliada.name}</p>
          )}
        </div>
      )}
    </div>
  );
}
