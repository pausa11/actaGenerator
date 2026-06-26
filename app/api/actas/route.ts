import { NextRequest, NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { getDbUser, getOrCreateDbUser } from '@/lib/db/utils';
import { actas, groups } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getDbUser(user.id);
  if (!dbUser) return NextResponse.json([], { status: 200 });

  const { searchParams } = request.nextUrl;
  const groupId = searchParams.get('groupId');
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);

  const conditions = [eq(actas.userId, dbUser.id)];
  if (groupId) conditions.push(eq(actas.groupId, groupId));

  const result = await db
    .select({
      id: actas.id,
      groupId: actas.groupId,
      title: actas.title,
      modelUsed: actas.modelUsed,
      status: actas.status,
      createdAt: actas.createdAt,
    })
    .from(actas)
    .where(and(...conditions))
    .orderBy(desc(actas.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getOrCreateDbUser(user);
  const body = await request.json();

  const { groupId, title, content, modelUsed } = body;
  if (!title || !content) return NextResponse.json({ error: 'Título y contenido requeridos' }, { status: 400 });

  if (groupId) {
    const [group] = await db.select().from(groups).where(and(eq(groups.id, groupId), eq(groups.userId, dbUser.id)));
    if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
  }

  const [newActa] = await db
    .insert(actas)
    .values({ userId: dbUser.id, groupId: groupId ?? null, title, content, modelUsed: modelUsed ?? null })
    .returning();

  return NextResponse.json(newActa, { status: 201 });
}
