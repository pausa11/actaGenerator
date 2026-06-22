import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import LightPillarBackground from "@/components/LightPillarBackground";
import Navbar from "@/components/Navbar";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Acta Generator',
  description: 'Genera actas de reunión a partir de audio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-black">
        <div className="fixed inset-0 -z-10">
          <LightPillarBackground />
        </div>
        <div className="relative">
          <Navbar />
        </div>
        {children}
      </body>
    </html>
  );
}
