"use client";

import { TriangleAlert } from "lucide-react";

import { useOpenAccount } from "@/features/accounts/hooks/use-open-account";
import { useOpenCategory } from "@/features/categories/hooks/use-open-category";
import { useOpenTransaction } from "@/features/transactions/hooks/use-open-transaction";
import { cn } from "@/lib/utils";

const linkStyle =
  "rounded-sm text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const AccountCell = ({ account, accountId }: { account: string; accountId: string }) => {
  const { onOpen } = useOpenAccount();
  return (
    <button type="button" className={linkStyle} onClick={() => onOpen(accountId)}>
      {account}
    </button>
  );
};

/** Uncategorized rows open the transaction so a category can be set right away. */
export const CategoryCell = ({
  id,
  category,
  categoryId,
}: {
  id: string;
  category: string | null;
  categoryId: string | null;
}) => {
  const { onOpen: openCategory } = useOpenCategory();
  const { onOpen: openTransaction } = useOpenTransaction();

  return (
    <button
      type="button"
      className={cn(linkStyle, "inline-flex items-center gap-1.5", !category && "text-warning")}
      onClick={() => (categoryId ? openCategory(categoryId) : openTransaction(id))}
    >
      {!category && <TriangleAlert className="size-3.5 shrink-0" aria-hidden />}
      {category ?? "Uncategorized"}
    </button>
  );
};
