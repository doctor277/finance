import { z } from "zod";

import { isDateKey } from "@/lib/dates";

/** Request schemas shared by the API (server/) and the client forms. */

export const idParamSchema = z.object({
  id: z.string().trim().min(1, "Missing id"),
});

export const idsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(1000),
});

export const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const transactionInputSchema = z.object({
  /** Calendar date, "yyyy-MM-dd". */
  date: z.string().refine(isDateKey, "Date must be a real date in yyyy-MM-dd format"),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().min(1).nullable().optional(),
  payee: z.string().trim().min(1, "Payee is required").max(200),
  /** Integer milliunits: $12.34 is stored as 12340. */
  amount: z.number().int().safe(),
  notes: z.string().max(1000).nullable().optional(),
});

export const bulkTransactionInputSchema = z
  .array(transactionInputSchema)
  .min(1)
  .max(5000);

const optionalDateKey = z
  .string()
  .optional()
  .refine((value) => !value || isDateKey(value), "Expected a yyyy-MM-dd date");

/** Empty strings mean "not set" (the client sends them for cleared filters). */
export const dateRangeQuerySchema = z.object({
  from: optionalDateKey,
  to: optionalDateKey,
  accountId: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
