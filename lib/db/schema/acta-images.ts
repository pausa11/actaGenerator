import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { actas } from './actas';

export const actaImages = pgTable('acta_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  actaId: uuid('acta_id').notNull().references(() => actas.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  name: text('name'),
  position: integer('position').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ActaImage = typeof actaImages.$inferSelect;
export type NewActaImage = typeof actaImages.$inferInsert;
