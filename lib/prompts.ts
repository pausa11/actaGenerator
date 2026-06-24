const ACTA_PROMPT_BASE = `Eres un asistente experto en redacción de actas de reuniones corporativas.

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

export function buildActaPrompt(groupContext?: string | null): string {
  if (!groupContext?.trim()) return ACTA_PROMPT_BASE;
  return `${ACTA_PROMPT_BASE}

## Contexto específico del grupo

${groupContext.trim()}

Tenés en cuenta este contexto al redactar el acta: usalo para entender mejor los temas, los participantes, la jerga o el estilo esperado en este grupo.`;
}

const ACTA_PROMPT_TEXTO_BASE = ACTA_PROMPT_BASE.replace(
  'Escucha el audio de esta reunión y genera un acta formal y completa en español, en formato Markdown.',
  'Lee la siguiente transcripción de una reunión y genera un acta formal y completa en español, en formato Markdown.'
).replace(
  '*Acta generada automáticamente a partir del audio de la reunión.*',
  '*Acta generada automáticamente a partir de la transcripción de la reunión.*'
).replace(
  '- No inventes información que no esté en el audio.',
  '- No inventes información que no esté en la transcripción.'
);

export function buildActaPromptDesdeTexto(transcripcion: string, groupContext?: string | null): string {
  const base = `${ACTA_PROMPT_TEXTO_BASE}

## Transcripción

${transcripcion}`;

  if (!groupContext?.trim()) return base;
  return `${base}

## Contexto específico del grupo

${groupContext.trim()}

Tenés en cuenta este contexto al redactar el acta: usalo para entender mejor los temas, los participantes, la jerga o el estilo esperado en este grupo.`;
}

export const ACTA_PROMPT = ACTA_PROMPT_BASE;
