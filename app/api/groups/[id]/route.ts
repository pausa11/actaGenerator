import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { groups, users } from '@/lib/db/schema';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const [existing] = await db.select().from(users).where(eq(users.supabaseId, user.id));
  if (!existing) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  const dbUser = existing;

  const { id } = await params;

  const deleted = await db
    .delete(groups)
    .where(and(eq(groups.id, id), eq(groups.userId, dbUser.id)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
