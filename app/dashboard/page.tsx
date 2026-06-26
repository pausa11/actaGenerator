import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { getDbUser } from '@/lib/db/utils';
import { groups, actas } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import GruposList from '@/components/GruposList';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const dbUser = await getDbUser(user.id);
  if (!dbUser) redirect('/auth/login');

  const rows = await db
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
    .limit(100);

  const initialGrupos = rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));

  return <GruposList initialGrupos={initialGrupos} />;
}
