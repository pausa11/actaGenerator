import { eq } from 'drizzle-orm';
import { db } from './index';
import { users } from './schema';

type DbUser = typeof users.$inferSelect;

const userCache = new Map<string, { user: DbUser; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function getDbUser(supabaseId: string): Promise<DbUser | null> {
  const hit = userCache.get(supabaseId);
  if (hit && hit.expiresAt > Date.now()) return hit.user;

  const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
  if (user) userCache.set(supabaseId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  return user ?? null;
}

export async function getOrCreateDbUser(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string };
}): Promise<DbUser> {
  const hit = userCache.get(supabaseUser.id);
  if (hit && hit.expiresAt > Date.now()) return hit.user;

  const email = supabaseUser.email ?? `${supabaseUser.id}@unknown.local`;
  const name = supabaseUser.user_metadata?.full_name ?? null;

  // onConflictDoNothing avoids a write on every request for existing users
  const [inserted] = await db
    .insert(users)
    .values({ supabaseId: supabaseUser.id, email, name })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    userCache.set(supabaseUser.id, { user: inserted, expiresAt: Date.now() + CACHE_TTL_MS });
    return inserted;
  }

  const [existing] = await db.select().from(users).where(eq(users.supabaseId, supabaseUser.id));
  userCache.set(supabaseUser.id, { user: existing, expiresAt: Date.now() + CACHE_TTL_MS });
  return existing!;
}
