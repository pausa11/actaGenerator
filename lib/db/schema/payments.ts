import { pgTable, uuid, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  externalId: text('external_id').unique(),
  amount: integer('amount').notNull(),
  currency: text('currency').default('COP').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  plan: text('plan').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
