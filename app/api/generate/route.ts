import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const PROMPT = `Eres un asistente experto en redacción de actas de reuniones corporativas.

Escucha el audio de esta reunión y genera un acta formal y completa en español, en formato Markdown.

Usa exactamente esta estructura:

# Acta de Reunión

**Fecha:** [fecha mencionada o dejar vacío]
**Hora de inicio:** [hora si se menciona]
**Hora de cierre:** [hora si se menciona]
**Lugar / Modalidad:** [presencial, virtual, plataforma usada]
**Facilitador / Moderador:** [nombre si se menciona]

## Participantes

- [Nombre y cargo si se menciona]

## Orden del Día

1. [Tema 1]
2. [Tema 2]

## Desarrollo de la Reunión

### [Tema 1]
[Resumen detallado de lo discutido, argumentos clave, posiciones de los participantes]

### [Tema 2]
[Resumen...]

## Decisiones Tomadas

- [ ] [Decisión 1]
- [ ] [Decisión 2]

## Compromisos y Tareas

| Responsable | Tarea | Fecha límite |
|-------------|-------|--------------|
| [Nombre] | [Tarea] | [Fecha] |

## Próximos Pasos

- [Acción concreta]

## Próxima Reunión

**Fecha propuesta:** [si se menciona]
**Temas pendientes:** [si se mencionan]

---
*Acta generada automáticamente a partir del audio de la reunión.*

Instrucciones adicionales:
- Si algún dato no está disponible en el audio, omite ese campo completamente.
- Sé preciso y formal.
- Captura todos los compromisos y decisiones concretas.
- No inventes información que no esté en el audio.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
  }

  let tempPath: string | null = null;
  let uploadedFileName: string | null = null;

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No se recibió archivo de audio' }, { status: 400 });
    }

    const extension = audioFile.name.split('.').pop() ?? 'mp3';
    tempPath = join(tmpdir(), `acta-${randomUUID()}.${extension}`);
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFile(tempPath, buffer);

    const fileManager = new GoogleAIFileManager(apiKey);
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: audioFile.type || 'audio/mpeg',
      displayName: audioFile.name,
    });
    uploadedFileName = uploadResult.file.name;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelParts = [
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      { text: PROMPT },
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

    for (const modelName of MODELS) {
      lastError = null;
      const model = genAI.getGenerativeModel({ model: modelName });
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await model.generateContent(modelParts);
          markdown = result.response.text();
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (isRateLimit(err)) {
            // Cuota agotada → saltar al siguiente modelo de inmediato
            console.warn(`[${modelName}] Límite de cuota alcanzado, probando siguiente modelo...`);
            break;
          }
          if (isOverloaded(err) && attempt < maxAttempts) {
            // Sobrecarga temporal → reintentar una vez con delay
            await new Promise(res => setTimeout(res, attempt * 3000));
            continue;
          }
          // Cualquier otro error → saltar al siguiente modelo
          console.warn(`[${modelName}] Error: ${lastError.message}, probando siguiente modelo...`);
          break;
        }
      }

      if (!lastError) break;
    }

    if (lastError) throw lastError;

    return NextResponse.json({ markdown });
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
  }
}
