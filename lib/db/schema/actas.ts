import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { groups } from './groups';

export const actaStatusEnum = pgEnum('acta_status', ['draft', 'final']);

export const actas = pgTable('actas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  audioUrl: text('audio_url'),
  modelUsed: text('model_used'),
  status: actaStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('actas_user_id_idx').on(t.userId),
  index('actas_group_id_idx').on(t.groupId),
  index('actas_user_id_created_at_idx').on(t.userId, t.createdAt),
]);

export type Acta = typeof actas.$inferSelect;
export type NewActa = typeof actas.$inferInsert;
