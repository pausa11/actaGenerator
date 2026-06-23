'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CardNav from './CardNav';

const items = [
  {
    label: 'Generar',
    bgColor: '#1e1b4b',
    textColor: '#e9d5ff',
    links: [
      { label: 'Nueva acta', href: '/generar', ariaLabel: 'Ir a generar acta' },
    ],
  },
  {
    label: 'Acceso',
    bgColor: '#2e1065',
    textColor: '#f3e8ff',
    links: [
      { label: 'Iniciar sesión', href: '/auth/login', ariaLabel: 'Ir a login' },
      { label: 'Registrarse', href: '/auth/register', ariaLabel: 'Ir a registro' },
    ],
  },
  {
    label: 'Inicio',
    bgColor: '#1e293b',
    textColor: '#cbd5e1',
    links: [
      { label: 'Ir al inicio', href: '/', ariaLabel: 'Ir a la página principal' },
    ],
  },
];

export default function Navbar() {
  const router = useRouter();
  const [sesionActiva, setSesionActiva] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState<string | undefined>();

  const extraerNombre = (session: { user?: { user_metadata?: { full_name?: string }; email?: string } } | null) => {
    if (!session?.user) return undefined;
    return session.user.user_metadata?.full_name || undefined;
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSesionActiva(!!data.session);
      setNombreUsuario(extraerNombre(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesionActiva(!!session);
      setNombreUsuario(extraerNombre(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <CardNav
      logoText="Acta Generator"
      greeting={sesionActiva ? nombreUsuario : undefined}
      items={items}
      baseColor="rgba(255,255,255,0.18)"
      menuColor="#ffffff"
      buttonBgColor={sesionActiva ? '#7c3aed' : undefined}
      buttonTextColor={sesionActiva ? '#ffffff' : undefined}
      buttonLabel={sesionActiva ? 'Cerrar sesión' : undefined}
      onButtonClick={sesionActiva ? cerrarSesion : undefined}
    />
  );
}
