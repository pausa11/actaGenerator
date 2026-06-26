import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 300;
import { createClient } from '@/lib/supabase/server';
import { buildActaPromptDesdeTexto } from '@/lib/prompts';
import { db } from '@/lib/db';
import { getDbUser } from '@/lib/db/utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { groups } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const isRateLimit = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || /quota|rate.?limit/i.test(msg);
};

const isOverloaded = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('503') || /service.?unavailable|high.?demand|overloaded/i.test(msg);
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`generate-text:${user.id}`, 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    const retryAfterSecs = Math.ceil(rateLimit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Esperá unos minutos antes de intentar de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
  }

  try {
    const { transcripcion, groupId } = await request.json() as { transcripcion: string; groupId?: string };

    if (!transcripcion?.trim()) {
      return NextResponse.json({ error: 'No se recibió texto de transcripción' }, { status: 400 });
    }

    let groupContext: string | null = null;
    if (groupId) {
      const dbUser = await getDbUser(user.id);
      if (dbUser) {
        const [group] = await db
          .select({ context: groups.context })
          .from(groups)
          .where(and(eq(groups.id, groupId), eq(groups.userId, dbUser.id)));
        groupContext = group?.context ?? null;
      }
    }

    const prompt = buildActaPromptDesdeTexto(transcripcion, groupContext);
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of MODELS) {
      const model = genAI.getGenerativeModel({ model: modelName });

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const streamResult = await model.generateContentStream(prompt);

          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of streamResult.stream) {
                  const text = chunk.text();
                  if (text) controller.enqueue(encoder.encode(text));
                }
              } finally {
                controller.close();
              }
            },
          });

          return new Response(readable, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Acta-Model': modelName,
            },
          });
        } catch (err) {
          if (isRateLimit(err)) {
            console.warn(`[${modelName}] Cuota alcanzada, probando siguiente modelo...`);
            break;
          }
          if (isOverloaded(err) && attempt < 2) {
            await new Promise(res => setTimeout(res, attempt * 3000));
            continue;
          }
          console.warn(`[${modelName}] Error: ${err instanceof Error ? err.message : err}`);
          break;
        }
      }
    }

    return NextResponse.json({ error: 'No se pudo generar el acta con ningún modelo disponible.' }, { status: 503 });
  } catch (error) {
    console.error('Error generando acta desde texto:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
