import { NextRequest, NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { actas, groups, users } from '@/lib/db/schema';

async function getOrCreateDbUser(supabaseUser: { id: string; email?: string; user_metadata?: { full_name?: string } }) {
  const [existing] = await db.select().from(users).where(eq(users.supabaseId, supabaseUser.id));
  if (existing) return existing;
  const email = supabaseUser.email ?? `${supabaseUser.id}@unknown.local`;
  const name = supabaseUser.user_metadata?.full_name ?? null;
  const [created] = await db.insert(users).values({ supabaseId: supabaseUser.id, email, name }).returning();
  return created;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getOrCreateDbUser(user);
  const groupId = request.nextUrl.searchParams.get('groupId');

  const conditions = [eq(actas.userId, dbUser.id)];
  if (groupId) conditions.push(eq(actas.groupId, groupId));

  const result = await db
    .select()
    .from(actas)
    .where(and(...conditions))
    .orderBy(desc(actas.createdAt));

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
