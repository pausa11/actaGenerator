import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { buildActaPromptDesdeTexto } from '@/lib/prompts';
import { db } from '@/lib/db';
import { groups, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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
      const [dbUser] = await db.select().from(users).where(eq(users.supabaseId, user.id));
      if (dbUser) {
        const [group] = await db
          .select({ context: groups.context })
          .from(groups)
          .where(and(eq(groups.id, groupId), eq(groups.userId, dbUser.id)));
        groupContext = group?.context ?? null;
      }
    }

    const prompt = buildActaPromptDesdeTexto(transcripcion, groupContext);

    const MODELS = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
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

    const genAI = new GoogleGenerativeAI(apiKey);
    let markdown = '';
    let lastError: Error | null = null;
    let usedModel = '';

    for (const modelName of MODELS) {
      lastError = null;
      const model = genAI.getGenerativeModel({ model: modelName });
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          markdown = result.response.text();
          usedModel = modelName;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (isRateLimit(err)) {
            console.warn(`[${modelName}] Límite de cuota alcanzado, probando siguiente modelo...`);
            break;
          }
          if (isOverloaded(err) && attempt < maxAttempts) {
            await new Promise(res => setTimeout(res, attempt * 3000));
            continue;
          }
          console.warn(`[${modelName}] Error: ${lastError.message}, probando siguiente modelo...`);
          break;
        }
      }

      if (!lastError) break;
    }

    if (lastError) throw lastError;

    return NextResponse.json({ markdown, model: usedModel });
  } catch (error) {
    console.error('Error generando acta desde texto:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
