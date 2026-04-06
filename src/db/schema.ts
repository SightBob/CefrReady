import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  image: varchar('image', { length: 1000 }),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => sql`NOW()`).notNull(),
}, (table) => ({
  providerUnique: unique().on(table.provider, table.providerId),
  emailUnique: unique().on(table.email),
}));  

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
