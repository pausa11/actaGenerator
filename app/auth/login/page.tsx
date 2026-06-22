'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Correo o contraseña incorrectos.');
      setCargando(false);
    } else {
      router.push('/generar');
      router.refresh();
    }
  };

  return (
    <div className="flex-1 flex items-start justify-center px-4 pt-32">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h1>
        <p className="text-sm text-white/60 mb-6">Accede a tu cuenta para generar actas.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-300 bg-red-500/15 border border-red-400/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-sm text-center text-white/50 mt-5">
          ¿No tienes cuenta?{' '}
          <Link href="/auth/register" className="text-purple-300 hover:text-purple-200 hover:underline font-medium">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
