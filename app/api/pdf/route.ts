import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const serviceUrl = process.env.PRINCE_SERVICE_URL;
  if (!serviceUrl) {
    return NextResponse.json({ error: 'PRINCE_SERVICE_URL no configurada' }, { status: 500 });
  }

  try {
    const { markdown, images } = await request.json();

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Markdown requerido' }, { status: 400 });
    }

    let finalMarkdown = markdown;

    if (Array.isArray(images) && images.length > 0) {
      const parts: string[] = ['\n\n---\n\n## Imágenes adjuntas\n'];
      for (const img of images) {
        if (!img.url) continue;
        try {
          const imgRes = await fetch(img.url);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mime = imgRes.headers.get('content-type') || 'image/jpeg';
            parts.push(`\n![${img.name ?? 'Imagen'}](data:${mime};base64,${base64})\n`);
          }
        } catch {
          // continuar si una imagen falla
        }
      }
      finalMarkdown += parts.join('');
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.SERVICE_SECRET) {
      headers['x-service-secret'] = process.env.SERVICE_SECRET;
    }

    const upstream = await fetch(`${serviceUrl}/convert`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ markdown: finalMarkdown }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ error: 'Error en el servicio PDF' }));
      return NextResponse.json(err, { status: upstream.status });
    }

    const pdf = await upstream.arrayBuffer();
    const fecha = new Date().toISOString().split('T')[0];

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="acta-${fecha}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generando PDF:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
