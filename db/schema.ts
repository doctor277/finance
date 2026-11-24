import { relations } from "drizzle-orm";
import { date, index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    plaidId: text("plaid_id"),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    plaidId: text("plaid_id"),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [index("categories_user_id_idx").on(table.userId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    /** Integer milliunits: $12.34 is stored as 12340, -$5 as -5000. */
    amount: integer("amount").notNull(),
    payee: text("payee").notNull(),
    notes: text("notes"),
    /** Calendar date as "yyyy-MM-dd". A bank statement date has no time or time zone. */
    date: date("date", { mode: "string" }).notNull(),
    accountId: text("account-id")
      .references(() => accounts.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: text("category-id").references(() => categories.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    // Equality on account first, then the date range: serves the list, reports,
    // and the duplicate lookup during CSV import.
    index("transactions_account_id_date_idx").on(table.accountId, table.date),
    index("transactions_category_id_idx").on(table.categoryId),
  ],
);

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));
