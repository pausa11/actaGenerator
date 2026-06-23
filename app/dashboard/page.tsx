'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, Trash2, Folder, X } from 'lucide-react';
import SplitText from '@/components/SplitText';

type Group = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  actaCount: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [grupos, setGrupos] = useState<Group[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contexto, setContexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      cargarGrupos();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarGrupos() {
    setCargando(true);
    try {
      const res = await fetch('/api/groups');
      if (res.ok) setGrupos(await res.json());
    } finally {
      setCargando(false);
    }
  }

  async function crearGrupo(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nombre, description: descripcion, context: contexto }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Error al crear grupo');
        return;
      }
      setNombre('');
      setDescripcion('');
      setContexto('');
      setMostrarForm(false);
      await cargarGrupos();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarGrupo(id: string) {
    setEliminando(id);
    try {
      await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      setGrupos((prev) => prev.filter((g) => g.id !== id));
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <SplitText
            tag="h1"
            text="Mis grupos"
            className="text-3xl font-bold text-white"
          />
          <p className="text-white/50 mt-1 text-sm">
            Organizá tus actas por grupo o proyecto.
          </p>
        </div>
        <button
          onClick={() => { setMostrarForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nuevo grupo
        </button>
      </div>

      {/* Modal crear grupo */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-[#0f0a1e] border border-white/15 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Crear grupo</h2>
              <button
                onClick={() => setMostrarForm(false)}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={crearGrupo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Proyecto Alpha, Equipo ventas…"
                  className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Descripción <span className="text-white/30">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Breve descripción del grupo…"
                  className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Contexto / instrucciones para Gemini <span className="text-white/30">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  placeholder={`Ej: Los participantes son del equipo de ventas. Usar tono formal. El moderador es Juan García.`}
                  className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <p className="text-white/25 text-xs mt-1">Gemini lo usará como guía al generar las actas de este grupo.</p>
              </div>

              {error && (
                <p className="text-sm text-red-300 bg-red-500/15 border border-red-400/25 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  className="flex-1 py-2 border border-white/15 text-white/60 hover:text-white text-sm rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {guardando ? 'Guardando…' : 'Crear grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contenido */}
      {cargando ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      ) : grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Users size={28} className="text-white/30" />
          </div>
          <p className="text-white/50 text-sm">Todavía no creaste ningún grupo.</p>
          <button
            onClick={() => { setMostrarForm(true); setError(''); }}
            className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
          >
            Crear mi primer grupo →
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map((grupo) => (
            <div
              key={grupo.id}
              onClick={() => router.push(`/dashboard/grupos/${grupo.id}`)}
              className="relative group p-5 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 backdrop-blur-xl transition-all cursor-pointer"
            >
              {/* Ícono y nombre */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
                  <Folder size={18} className="text-purple-400" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); eliminarGrupo(grupo.id); }}
                  disabled={eliminando === grupo.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  title="Eliminar grupo"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h3 className="text-white font-semibold text-base leading-snug mb-1">
                {grupo.name}
              </h3>

              {grupo.description && (
                <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">
                  {grupo.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/8">
                <span className="text-xs text-white/30">
                  {new Date(grupo.createdAt).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-xs text-purple-400 font-medium">
                  {grupo.actaCount} {grupo.actaCount === 1 ? 'acta' : 'actas'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
