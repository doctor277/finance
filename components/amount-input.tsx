import * as React from "react";
import CurrencyInput from "react-currency-input-field";
import { Info, MinusCircle, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
};

export const AmountInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, placeholder, disabled }, ref) => {
    const parsedValue = parseFloat(value);
    const isIncome = parsedValue > 0;
    const isExpense = parsedValue < 0;

    const onReverseValue = () => {
      if (!value) return;
      // Flip the sign on the text itself so "12.30" stays "-12.30" (not "-12.3").
      onChange(value.startsWith("-") ? value.slice(1) : `-${value}`);
    };

    return (
      <div className="relative">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onReverseValue}
                aria-label={isExpense ? "Expense: switch to income" : "Income: switch to expense"}
                className={cn(
                  "absolute top-1.5 left-1.5 rounded-md p-2 flex items-center justify-center",
                  "bg-slate-400 hover:bg-slate-500 transition",
                  isIncome && "bg-emerald-500 hover:bg-emerald-600",
                  isExpense && "bg-rose-500 hover:bg-rose-600",
                )}
              >
                {!parsedValue && <Info className="size-3 text-white" />}
                {isIncome && <PlusCircle className="size-3 text-white" />}
                {isExpense && <MinusCircle className="size-3 text-white" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Use [+] for income and [-] for expenses
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <CurrencyInput
          ref={ref} // ✅ use ref, not getInputRef
          prefix="$"
          placeholder={placeholder}
          value={value}
          decimalsLimit={2}
          decimalScale={2}
          onValueChange={onChange}
          disabled={disabled}
          className={cn(
            "pl-11 file:text-foreground placeholder:text-muted-foreground",
            "selection:bg-primary selection:text-primary-foreground",
            "dark:bg-input/30 border-input",
            "h-9 w-full rounded-md border bg-transparent pr-3 py-1 text-base",
            "shadow-xs outline-none transition-[color,box-shadow]",
            "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            "dark:aria-invalid:ring-destructive/40 md:text-sm",
          )}
        />

        <p className="text-xs text-muted-foreground mt-2">
          {isIncome && "This will count as income"}
          {isExpense && "This will count as expense"}
        </p>
      </div>
    );
  },
);

AmountInput.displayName = "AmountInput";
