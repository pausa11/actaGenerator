import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { getOrCreateDbUser } from '@/lib/db/utils';
import { groups, actas } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const dbUser = await getOrCreateDbUser(user);
  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 200);
  const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);

  const result = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      context: groups.context,
      createdAt: groups.createdAt,
      actaCount: sql<number>`cast(count(${actas.id}) as int)`.as('acta_count'),
    })
    .from(groups)
    .leftJoin(actas, eq(actas.groupId, groups.id))
    .where(eq(groups.userId, dbUser.id))
    .groupBy(groups.id, groups.name, groups.description, groups.context, groups.createdAt)
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
  const name = (body.name ?? '').trim();
  const description = (body.description ?? '').trim() || null;
  const context = (body.context ?? '').trim() || null;

  if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });

  const [newGroup] = await db
    .insert(groups)
    .values({ userId: dbUser.id, name, description, context })
    .returning();

  return NextResponse.json(newGroup, { status: 201 });
}
