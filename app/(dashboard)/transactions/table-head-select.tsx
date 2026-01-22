import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  columnIndex: number;
  selectedColumns: Record<string, string | null>;
  onChange: (columnIndex: number, value: string | null) => void;
};

const options = ["amount", "payee", "date"];

export const TableHeadSelect = ({
  columnIndex,
  selectedColumns,
  onChange,
}: Props) => {
  // ✅ use the SAME key format everywhere: column_0, column_1, etc.
  const key = `column_${columnIndex}`;
  const currentSelection = selectedColumns[key] ?? null;

  return (
    <Select
      value={currentSelection ?? "skip"}
      onValueChange={(value) =>
        onChange(columnIndex, value === "skip" ? null : value)
      }
    >
      <SelectTrigger
        className={cn(
          "focus:ring-offset-0 focus:ring-transparent outline-none border-none bg-transparent capitalize",
          currentSelection && "text-blue-500",
        )}
      >
        <SelectValue placeholder="Skip" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="skip">Skip</SelectItem>

        {options.map((option) => {
          const disabled =
            Object.values(selectedColumns).includes(option) &&
            currentSelection !== option;

          return (
            <SelectItem
              key={option}
              value={option}
              disabled={disabled}
              className="capitalize"
            >
              {option}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
