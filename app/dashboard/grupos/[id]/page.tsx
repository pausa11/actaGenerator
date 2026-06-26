import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { getDbUser } from '@/lib/db/utils';
import { groups, actas } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import GroupDetail from '@/components/GroupDetail';

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const dbUser = await getDbUser(user.id);
  if (!dbUser) redirect('/auth/login');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, dbUser.id)));

  if (!group) redirect('/dashboard');

  const actasRows = await db
    .select({
      id: actas.id,
      title: actas.title,
      modelUsed: actas.modelUsed,
      status: actas.status,
      createdAt: actas.createdAt,
    })
    .from(actas)
    .where(and(eq(actas.userId, dbUser.id), eq(actas.groupId, groupId)))
    .orderBy(desc(actas.createdAt))
    .limit(100);

  const initialActas = actasRows.map(a => ({ ...a, createdAt: a.createdAt.toISOString() }));
  const initialGroup = { ...group, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString() };

  return <GroupDetail initialGroup={initialGroup} initialActas={initialActas} />;
}
