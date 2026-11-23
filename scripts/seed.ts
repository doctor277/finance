/**
 * Demo data for one user: three accounts, ten categories and about four months
 * of realistic transactions (payroll, rent, groceries, a few uncategorized).
 *
 *   SEED_USER_ID=user_xxx bun run db:seed
 *
 * Only that user's accounts and categories (and, through the foreign keys, their
 * transactions) are deleted and recreated. Nobody else's data is touched.
 * Random choices use a fixed seed, so two runs on the same day give the same data.
 */
import { config } from "dotenv";
import { createId } from "@paralleldrive/cuid2";
import { eachDayOfInterval, endOfMonth, getDate, getDay, isSameDay, startOfMonth, subMonths } from "date-fns";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

import { accounts, categories, transactions } from "@/db/schema";
import { toDateKey } from "@/lib/dates";

config({ path: ".env.local", quiet: true });

const userId = process.env.SEED_USER_ID;
if (!userId || !/^user_[A-Za-z0-9]+$/.test(userId)) {
  console.error("Set SEED_USER_ID to the Clerk user id to seed (looks like user_2abc...).");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (copy .env.example to .env.local).");
  process.exit(1);
}

const db = drizzle(neon(process.env.DATABASE_URL));

// Deterministic PRNG (mulberry32) so the demo looks the same every run.
let state = 20261123;
const random = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => Math.round((min + random() * (max - min)) * 100) * 10; // milliunits, whole cents

const ACCOUNTS = {
  chequing: { id: createId(), name: "Everyday Chequing" },
  visa: { id: createId(), name: "Visa Card" },
  savings: { id: createId(), name: "High-Interest Savings" },
};

const CATEGORY_NAMES = [
  "Salary", "Rent", "Groceries", "Dining out", "Transport",
  "Utilities", "Subscriptions", "Shopping", "Health", "Entertainment",
] as const;
type CategoryName = (typeof CATEGORY_NAMES)[number];
const CATEGORIES = Object.fromEntries(CATEGORY_NAMES.map((name) => [name, createId()])) as Record<CategoryName, string>;

type Row = typeof transactions.$inferInsert;
const rows: Row[] = [];
const add = (date: Date, account: keyof typeof ACCOUNTS, payee: string, amount: number, category: CategoryName | null, notes: string | null = null) =>
  rows.push({
    id: createId(),
    date: toDateKey(date),
    accountId: ACCOUNTS[account].id,
    categoryId: category ? CATEGORIES[category] : null,
    payee,
    amount,
    notes,
  });

const today = new Date();
const days = eachDayOfInterval({ start: startOfMonth(subMonths(today, 3)), end: today });

for (const day of days) {
  const dom = getDate(day);
  const weekday = getDay(day); // 0 = Sunday
  const lastDay = isSameDay(day, endOfMonth(day));

  // Fixed monthly items. Payee spellings match public/samples/05 so importing it shows duplicates.
  if (dom === 1) add(day, "chequing", "RENT - MAPLE PROPERTY MGMT", -1_850_000, "Rent", "Monthly rent");
  if (dom === 15 || lastDay) add(day, "chequing", "PAYROLL - NORTHWIND LOGISTICS", 2_412_500, "Salary");
  if (dom === 3) add(day, "visa", "Summit Fitness", -45_000, "Health", "Membership");
  if (dom === 5) add(day, "chequing", "Rogers Internet", -75_000, "Utilities");
  if (dom === 8) add(day, "visa", "NETFLIX.COM", -16_490, "Subscriptions");
  if (dom === 11) add(day, "chequing", "HYDRO OTTAWA", -82_170, "Utilities", "Autopay");
  if (dom === 16) add(day, "savings", "Transfer from chequing", 300_000, null, "Monthly savings");
  if (dom === 20) add(day, "chequing", "Fido Mobile", -55_000, "Utilities");
  if (dom === 22) add(day, "visa", "Spotify", -11_990, "Subscriptions");
  if (lastDay) add(day, "savings", "Interest", between(0.9, 1.6), null);

  // Day-to-day spending.
  if ((weekday === 2 || weekday === 6) && random() < 0.85) {
    add(day, "visa", pick(["LOBLAWS 1052", "METRO #145", "FRESHCO DANFORTH", "Farm Boy"]), -between(38, 165), "Groceries");
  }
  if (weekday >= 1 && weekday <= 5 && random() < 0.55) {
    add(day, "visa", "TIM HORTONS #2231", -between(2.5, 8.5), "Dining out");
  }
  if (random() < 0.22) {
    add(day, "visa", pick(["Pho Saigon", "The Wellington", "Pizza Pide", "Shawarma Palace"]), -between(18, 72), "Dining out");
  }
  if (weekday >= 1 && weekday <= 5 && random() < 0.35) {
    add(day, "chequing", "PRESTO FARE", -3_350, "Transport");
  }
  if (random() < 0.07) add(day, "visa", "Uber Trip", -between(12, 38), "Transport");
  if (random() < 0.14) {
    add(day, "visa", pick(["AMAZON.CA, MARKETPLACE", "Canadian Tire", "Winners", "IKEA Ottawa"]), -between(15, 140), "Shopping");
  }
  if (random() < 0.05) add(day, "visa", "Shoppers Drug Mart", -between(8, 55), "Health");
  if (random() < 0.05) add(day, "visa", pick(["Cineplex", "Ottawa Senators", "Steam"]), -between(14, 90), "Entertainment");
  // A few left uncategorized, like a real account mid-cleanup.
  if (random() < 0.03) add(day, "visa", pick(["SQ *MARKET STALL", "PAYPAL *EBAY", "E-TRANSFER SENT"]), -between(10, 60), null);
}

const main = async () => {
  // Deleting the user's accounts cascades to their transactions.
  await db.delete(accounts).where(eq(accounts.userId, userId));
  await db.delete(categories).where(eq(categories.userId, userId));

  await db.insert(accounts).values(Object.values(ACCOUNTS).map((a) => ({ ...a, userId, plaidId: null })));
  await db.insert(categories).values(CATEGORY_NAMES.map((name) => ({ id: CATEGORIES[name], name, userId, plaidId: null })));
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(transactions).values(rows.slice(i, i + 500));
  }

  console.log(
    `Seeded ${rows.length} transactions (${days[0].toDateString()} to ${today.toDateString()}) for ${userId}.`,
  );
};

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
