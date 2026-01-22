import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenCategory } from "@/features/categories/hooks/use-open-category";
import { useOpenTransaction } from "@/features/transactions/hooks/use-open-transaction";

type Props = {
  id: string;
  category: string | null;
  categoryId: string | null;
};

export const CategorytColumn = ({ id, category, categoryId }: Props) => {
  const { onOpen: onOpenCategory } = useOpenCategory();
  const { onOpen: onOpenTransaction } = useOpenTransaction();

  const onClick = () => {
    // ✅ If it's uncategorized, open the transaction so you can set a category
    if (!categoryId) {
      onOpenTransaction(id);
      return;
    }

    // ✅ If it has a category, open the category editor
    onOpenCategory(categoryId);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2",
        "cursor-pointer hover:underline",
        !category && "text-rose-500 underline underline-offset-4",
      )}
    >
      {!category && <TriangleAlert className="size-4 shrink-0" />}
      {category ?? "Uncategorized"}
    </div>
  );
};
