import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { groups, actas, users } from '@/lib/db/schema';

async function getOrCreateDbUser(supabaseUser: { id: string; email?: string; user_metadata?: { full_name?: string } }) {
  const [existing] = await db.select().from(users).where(eq(users.supabaseId, supabaseUser.id));
  if (existing) return existing;

  const email = supabaseUser.email ?? `${supabaseUser.id}@unknown.local`;
  const name = supabaseUser.user_metadata?.full_name ?? null;
  const [created] = await db.insert(users).values({ supabaseId: supabaseUser.id, email, name }).returning();
  return created;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getOrCreateDbUser(user);

  const result = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      createdAt: groups.createdAt,
      actaCount: sql<number>`cast(count(${actas.id}) as int)`.as('acta_count'),
    })
    .from(groups)
    .leftJoin(actas, eq(actas.groupId, groups.id))
    .where(eq(groups.userId, dbUser.id))
    .groupBy(groups.id, groups.name, groups.description, groups.createdAt);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getOrCreateDbUser(user);

  const body = await request.json();
  const name = (body.name ?? '').trim();
  const description = (body.description ?? '').trim() || null;

  if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

  const [newGroup] = await db
    .insert(groups)
    .values({ userId: dbUser.id, name, description })
    .returning();

  return NextResponse.json(newGroup, { status: 201 });
}
