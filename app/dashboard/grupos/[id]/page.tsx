'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Plus, Trash2, FileText, Clock, Settings2, X, Download, FileDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Acta = {
  id: string;
  title: string;
  content: string;
  modelUsed: string | null;
  status: 'draft' | 'final';
  createdAt: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  context: string | null;
};

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [grupo, setGrupo] = useState<Group | null>(null);
  const [actas, setActas] = useState<Acta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [descargandoPDFId, setDescargandoPDFId] = useState<string | null>(null);
  const [descargandoPDFModal, setDescargandoPDFModal] = useState(false);
  const [actaDetalle, setActaDetalle] = useState<Acta | null>(null);
  const [mostrarContexto, setMostrarContexto] = useState(false);
  const [contextoEdit, setContextoEdit] = useState('');
  const [guardandoContexto, setGuardandoContexto] = useState(false);
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/login'); return; }
      cargar();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function cargar() {
    setCargando(true);
    try {
      const [gruposRes, actasRes] = await Promise.all([
        fetch('/api/groups'),
        fetch(`/api/actas?groupId=${groupId}`),
      ]);
      if (gruposRes.ok) {
        const grupos = await gruposRes.json();
        const found = grupos.find((g: Group) => g.id === groupId);
        if (!found) { router.replace('/dashboard'); return; }
        setGrupo(found);
      }
      if (actasRes.ok) setActas(await actasRes.json());
    } finally {
      setCargando(false);
    }
  }

  async function guardarContexto() {
    if (!grupo) return;
    setGuardandoContexto(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: contextoEdit }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGrupo(prev => prev ? { ...prev, context: updated.context } : prev);
        setMostrarContexto(false);
      }
    } finally {
      setGuardandoContexto(false);
    }
  }

  async function eliminarActa(id: string) {
    setEliminando(id);
    try {
      await fetch(`/api/actas/${id}`, { method: 'DELETE' });
      setActas((prev) => prev.filter((a) => a.id !== id));
      if (actaDetalle?.id === id) setActaDetalle(null);
    } finally {
      setEliminando(null);
    }
  }

  function sanitizarNombre(titulo: string) {
    return titulo.trim()
      ? titulo.trim().replace(/[/\\:*?"<>|]/g, '-').replace(/\s+/g, '_')
      : `acta-${new Date().toISOString().split('T')[0]}`;
  }

  async function descargarPDF(content: string, title: string, actaId?: string) {
    if (actaId) setDescargandoPDFId(actaId); else setDescargandoPDFModal(true);
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: content }),
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
            <h1 className="text-2xl font-bold text-white">
              {cargando ? '…' : (grupo?.name ?? 'Grupo')}
            </h1>
            {grupo?.description && (
              <p className="text-white/50 text-sm mt-1">{grupo.description}</p>
            )}
            {grupo?.context && (
              <p className="text-purple-400/70 text-xs mt-1 flex items-center gap-1">
                <Settings2 size={11} />
                Contexto personalizado activo
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setContextoEdit(grupo?.context ?? ''); setMostrarContexto(true); }}
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

      {cargando ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      ) : actas.length === 0 ? (
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
              onClick={() => setActaDetalle(acta)}
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

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); descargarMd(acta.content, acta.title); }}
                  className="p-1.5 rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  title="Descargar .md"
                >
                  <FileDown size={15} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); descargarPDF(acta.content, acta.title, acta.id); }}
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
      {actaDetalle && (
        <div
          ref={actaModalRef}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-[#0f0a1e] border border-white/15 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-base font-semibold text-white truncate pr-4">{actaDetalle.title}</h2>
              <div className="flex items-center gap-4 flex-shrink-0">
                <button
                  onClick={() => descargarMd(actaDetalle.content, actaDetalle.title)}
                  className="text-white/40 hover:text-blue-400 text-sm transition-colors"
                >
                  Descargar .md
                </button>
                <button
                  onClick={() => descargarPDF(actaDetalle.content, actaDetalle.title)}
                  disabled={descargandoPDFModal}
                  className="text-purple-400 hover:text-purple-300 text-sm transition-colors disabled:opacity-50"
                >
                  {descargandoPDFModal ? 'Generando…' : 'Exportar PDF'}
                </button>
                <button
                  onClick={() => setActaDetalle(null)}
                  className="text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="p-6">
              <article className="bg-white rounded-xl p-8 prose prose-gray max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{actaDetalle.content}</ReactMarkdown>
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

