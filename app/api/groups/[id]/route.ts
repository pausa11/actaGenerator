import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { getDbUser } from '@/lib/db/utils';
import { groups } from '@/lib/db/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getDbUser(user.id);
  if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const { id } = await params;
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, id), eq(groups.userId, dbUser.id)));

  if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });

  return NextResponse.json(group);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getDbUser(user.id);
  if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updatedAt: sql`now()` };
  if ('name' in body) updates.name = (body.name ?? '').trim();
  if ('description' in body) updates.description = (body.description ?? '').trim() || null;
  if ('context' in body) updates.context = (body.context ?? '').trim() || null;

  const [updated] = await db
    .update(groups)
    .set(updates)
    .where(and(eq(groups.id, id), eq(groups.userId, dbUser.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getDbUser(user.id);
  if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const { id } = await params;

  const deleted = await db
    .delete(groups)
    .where(and(eq(groups.id, id), eq(groups.userId, dbUser.id)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
