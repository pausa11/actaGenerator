import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { actas } from './actas';
import { users } from './users';

export const auditActionEnum = pgEnum('audit_action', [
  'created',
  'edited',
  'downloaded',
  'shared',
  'deleted',
  'status_changed',
]);

export const actaAudit = pgTable('acta_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  actaId: uuid('acta_id').notNull().references(() => actas.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: auditActionEnum('action').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ActaAudit = typeof actaAudit.$inferSelect;
export type NewActaAudit = typeof actaAudit.$inferInsert;
