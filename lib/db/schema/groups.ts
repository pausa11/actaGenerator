import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
