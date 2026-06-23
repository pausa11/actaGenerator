import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { actas, users } from '@/lib/db/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.supabaseId, user.id));
  if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const { id } = await params;
  const [acta] = await db.select().from(actas).where(and(eq(actas.id, id), eq(actas.userId, dbUser.id)));
  if (!acta) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });

  return NextResponse.json(acta);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.supabaseId, user.id));
  if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const { id } = await params;
  const deleted = await db
    .delete(actas)
    .where(and(eq(actas.id, id), eq(actas.userId, dbUser.id)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
