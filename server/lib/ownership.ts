import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, categories } from "@/db/schema";

const unique = (ids: (string | null | undefined)[]) =>
  Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

/** True when every given account id exists and belongs to `userId`. */
export async function ownsAllAccounts(
  userId: string,
  accountIds: (string | null | undefined)[],
): Promise<boolean> {
  const ids = unique(accountIds);
  if (ids.length === 0) return true;

  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), inArray(accounts.id, ids)));

  return rows.length === ids.length;
}

/** True when every given (non-null) category id exists and belongs to `userId`. */
export async function ownsAllCategories(
  userId: string,
  categoryIds: (string | null | undefined)[],
): Promise<boolean> {
  const ids = unique(categoryIds);
  if (ids.length === 0) return true;

  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));

  return rows.length === ids.length;
}
