import { NextRequest, NextResponse } from 'next/server';
import { and, eq, asc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { actas, actaImages, users } from '@/lib/db/schema';

async function getAuthorizedActa(actaId: string, supabaseUserId: string) {
  const [dbUser] = await db.select().from(users).where(eq(users.supabaseId, supabaseUserId));
  if (!dbUser) return null;
  const [acta] = await db.select().from(actas).where(and(eq(actas.id, actaId), eq(actas.userId, dbUser.id)));
  return acta ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const acta = await getAuthorizedActa(id, user.id);
  if (!acta) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });

  const images = await db
    .select()
    .from(actaImages)
    .where(eq(actaImages.actaId, id))
    .orderBy(asc(actaImages.position), asc(actaImages.createdAt));

  return NextResponse.json(images);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const acta = await getAuthorizedActa(id, user.id);
  if (!acta) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });

  const { url, name } = await request.json();
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 });

  const [newImage] = await db
    .insert(actaImages)
    .values({ actaId: id, url, name: name ?? null })
    .returning();

  return NextResponse.json(newImage, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const acta = await getAuthorizedActa(id, user.id);
  if (!acta) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('imageId');
  if (!imageId) return NextResponse.json({ error: 'imageId requerido' }, { status: 400 });

  const [image] = await db
    .select()
    .from(actaImages)
    .where(and(eq(actaImages.id, imageId), eq(actaImages.actaId, id)));
  if (!image) return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });

  await db.delete(actaImages).where(eq(actaImages.id, imageId));

  return NextResponse.json({ ok: true });
}
