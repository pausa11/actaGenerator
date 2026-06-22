'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail } from 'lucide-react';
import SplitText from '@/components/SplitText';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setCargando(false);
    } else {
      setEnviado(true);
    }
  };

  if (enviado) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-lg text-center">
          <Mail className="mx-auto mb-3 text-purple-300" size={32} />
          <SplitText tag="h2" text="Revisa tu correo" className="text-xl font-bold text-white mb-2" />
          <p className="text-sm text-white/60">
            Te enviamos un enlace de confirmación a <strong className="text-white">{email}</strong>. Haz clic en él para activar tu cuenta.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-6 text-sm text-purple-300 hover:text-purple-200 hover:underline font-medium"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-start justify-center px-4 pt-32">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-lg">
        <SplitText tag="h1" text="Crear cuenta" className="text-2xl font-bold text-white mb-1" />
        <p className="text-sm text-white/60 mb-6">Regístrate para acceder al generador de actas.</p>

        <form onSubmit={handleRegister} className="space-y-4">
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Mínimo 6 caracteres"
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
            {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-sm text-center text-white/50 mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-purple-300 hover:text-purple-200 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
