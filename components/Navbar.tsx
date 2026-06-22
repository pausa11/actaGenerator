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
      { label: 'Nueva acta', href: '/', ariaLabel: 'Ir a generar acta' },
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
    label: 'Soporte',
    bgColor: '#1e293b',
    textColor: '#cbd5e1',
    links: [
      { label: 'Ayuda', href: '#', ariaLabel: 'Centro de ayuda' },
    ],
  },
];

export default function Navbar() {
  const router = useRouter();
  const [sesionActiva, setSesionActiva] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSesionActiva(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesionActiva(!!session);
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
      items={items}
      baseColor="rgba(255,255,255,0.18)"
      menuColor="#ffffff"
      {...(sesionActiva && {
        buttonBgColor: '#7c3aed',
        buttonTextColor: '#ffffff',
        buttonLabel: 'Cerrar sesión',
        onButtonClick: cerrarSesion,
      })}
    />
  );
}
