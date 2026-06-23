import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const planEnum = pgEnum('plan', ['free', 'pro', 'enterprise']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseId: text('supabase_id').unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  plan: planEnum('plan').default('free').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
