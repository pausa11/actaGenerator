'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { GoHome } from 'react-icons/go';
import { createClient } from '@/lib/supabase/client';
import CardNav from './CardNav';
import './CardNav.css';

const itemsBase = [
  {
    label: 'Generar',
    bgColor: '#1e1b4b',
    textColor: '#e9d5ff',
    links: [
      { label: 'Nueva acta', href: '/generar', ariaLabel: 'Ir a generar acta' },
      { label: 'Dashboard', href: '/dashboard', ariaLabel: 'Ir al dashboard' },
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
    label: 'Información',
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
    const fullName = session.user.user_metadata?.full_name;
    if (fullName) return fullName;
    const email = session.user.email;
    return email ? email.split('@')[0] : undefined;
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

  const sesionItem = {
    label: 'Cuenta',
    bgColor: '#18181b',
    textColor: '#e4e4e7',
    links: [
      { label: 'Cerrar sesión', action: cerrarSesion, ariaLabel: 'Cerrar sesión' },
    ],
  };

  const itemsActivos = sesionActiva
    ? [...itemsBase.filter(i => i.label !== 'Acceso'), sesionItem]
    : itemsBase;

  const logoNode = (
    <span style={{ fontSize: '1rem', letterSpacing: '-0.3px', lineHeight: 1 }}>
      <strong style={{ color: '#ffffff', fontWeight: 700 }}>Acta </strong>
      <span style={{ background: 'linear-gradient(to right, #a78bfa, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pro</span>
    </span>
  );

  return (
    <div className="navbar-wrapper">
      <div className="navbar-left-group">
        <Link href="/" className="navbar-external-logo" aria-label="Ir al inicio">
          <Image
            src="/actaProLogo.png"
            alt="Acta Pro"
            width={80}
            height={32}
            priority
          />
        </Link>
        {sesionActiva && nombreUsuario && (
          <span className="navbar-external-greeting">
            Hola, <strong>{nombreUsuario}</strong>
          </span>
        )}
      </div>
      <CardNav
        logoNode={logoNode}
        logoAlt="Acta Pro"
        items={itemsActivos}
        baseColor="rgba(15, 12, 35, 0.42)"
        menuColor="#ffffff"
        topRightNode={
          sesionActiva ? (
            <Link href="/dashboard" aria-label="Ir al dashboard">
              <GoHome size={24} color="#ffffff" />
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}
