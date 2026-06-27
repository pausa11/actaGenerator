import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import LightPillarBackground from "@/components/LightPillarBackground";
import Navbar from "@/components/Navbar";
const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Acta Pro',
  description: 'Genera actas de reunión a partir de audio',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon-192.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="relative min-h-screen bg-black flex flex-col">
        <div className="pointer-events-none fixed inset-0 z-0">
          <LightPillarBackground />
        </div>
        <div className="sticky top-0 z-50">
          <Navbar />
        </div>
        <main className="relative z-10 flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
