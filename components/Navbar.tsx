'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CardNav from './CardNav';

const items = [
  {
    label: 'Generar',
    bgColor: '#1e293b',
    textColor: '#f8fafc',
    links: [
      { label: 'Nueva acta', href: '/', ariaLabel: 'Ir a generar acta' },
    ],
  },
  {
    label: 'Acceso',
    bgColor: '#f1f5f9',
    textColor: '#0f172a',
    links: [
      { label: 'Iniciar sesión', href: '/auth/login', ariaLabel: 'Ir a login' },
      { label: 'Registrarse', href: '/auth/register', ariaLabel: 'Ir a registro' },
    ],
  },
  {
    label: 'Soporte',
    bgColor: '#eff6ff',
    textColor: '#1e3a8a',
    links: [
      { label: 'Ayuda', href: '#', ariaLabel: 'Centro de ayuda' },
    ],
  },
];

export default function Navbar() {
  const router = useRouter();

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
      buttonBgColor="#2563eb"
      buttonTextColor="#ffffff"
      buttonLabel="Cerrar sesión"
      onButtonClick={cerrarSesion}
    />
  );
}
