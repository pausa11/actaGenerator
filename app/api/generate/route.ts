import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { buildActaPrompt } from '@/lib/prompts';
import { db } from '@/lib/db';
import { groups, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 300;

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

  let tempPath: string | null = null;
  let uploadedFileName: string | null = null;
  let audioPath: string | null = null;

  try {
    const formData = await request.formData();
    const audioUrl = formData.get('audioUrl') as string | null;
    audioPath = formData.get('audioPath') as string | null;
    const audioName = formData.get('audioName') as string | null;
    const audioType = formData.get('audioType') as string | null;
    const groupId = formData.get('groupId') as string | null;

    if (!audioUrl) {
      return NextResponse.json({ error: 'No se recibió URL del audio' }, { status: 400 });
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

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error('Error descargando el audio desde el almacenamiento');
    const extension = (audioName ?? 'audio').split('.').pop() ?? 'mp3';
    tempPath = join(tmpdir(), `acta-${randomUUID()}.${extension}`);
    const buffer = Buffer.from(await audioResponse.arrayBuffer());
    await writeFile(tempPath, buffer);

    const fileManager = new GoogleAIFileManager(apiKey);
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: audioType || 'audio/mpeg',
      displayName: audioName ?? 'audio',
    });
    uploadedFileName = uploadResult.file.name;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelParts = [
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      { text: buildActaPrompt(groupContext) },
    ];

    // Ordenados de mejor a peor calidad; todos soportan audio via Files API
    // Solo modelos con cuota disponible en esta cuenta (excluye 0/0 como gemini-2.0-flash)
    const MODELS = [
      'gemini-3.5-flash',          // Generación 3.5 — mejor calidad disponible
      'gemini-3.1-flash-lite',     // Generación 3.1 — estable, 500 RPD (mayor cuota diaria)
      'gemini-3-flash-preview',    // Generación 3.0
      'gemini-2.5-flash',          // Generación 2.5 — probado y estable
      'gemini-2.5-flash-lite',     // Generación 2.5 lite — último recurso
    ];

    const isRateLimit = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return msg.includes('429') || /quota|rate.?limit/i.test(msg);
    };

    const isOverloaded = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return msg.includes('503') || /service.?unavailable|high.?demand|overloaded/i.test(msg);
    };

    let markdown = '';
    let lastError: Error | null = null;
    let usedModel = '';

    for (const modelName of MODELS) {
      lastError = null;
      const model = genAI.getGenerativeModel({ model: modelName });
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await model.generateContent(modelParts);
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
    console.error('Error generando acta:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempPath) await unlink(tempPath).catch(() => {});
    if (uploadedFileName) {
      const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
      await fileManager.deleteFile(uploadedFileName).catch(() => {});
    }
    if (audioPath) {
      const supabase = await createClient();
      await supabase.storage.from('audio-uploads').remove([audioPath]).catch(() => {});
    }
  }
}
