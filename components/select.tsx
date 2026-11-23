"use client";

import { useMemo } from "react";
import { SingleValue } from "react-select";
import CreatableSelect from "react-select/creatable";

type Option = { label: string; value: string };

type Props = {
  onChange: (value?: string) => void;
  onCreate?: (value: string) => void;
  options?: Option[];
  value?: string | null | undefined;
  disabled?: boolean;
  placeholder?: string;
  /** id of the inner input, so a <Label htmlFor> can name it. */
  inputId?: string;
  /** Set by FormControl; used as the input id so FormLabel points at it. */
  id?: string;
};

/** Searchable select that can also create a new option (accounts, categories). */
export const Select = ({ value, onChange, disabled, onCreate, options = [], placeholder, inputId, id }: Props) => {
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  return (
    <CreatableSelect<Option, false>
      inputId={inputId ?? id}
      placeholder={placeholder}
      className="text-sm"
      value={selected}
      onChange={(option: SingleValue<Option>) => onChange(option?.value)}
      options={options}
      onCreateOption={onCreate}
      isDisabled={disabled}
      formatCreateLabel={(input) => `Create "${input}"`}
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: 36,
          borderRadius: 6,
          borderColor: state.isFocused ? "var(--ring)" : "var(--input)",
          boxShadow: state.isFocused ? "0 0 0 3px color-mix(in srgb, var(--ring) 35%, transparent)" : "none",
          ":hover": { borderColor: state.isFocused ? "var(--ring)" : "var(--input)" },
        }),
        placeholder: (base) => ({ ...base, color: "var(--muted-foreground)" }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected ? "var(--primary)" : state.isFocused ? "var(--accent)" : "transparent",
          color: state.isSelected ? "var(--primary-foreground)" : "var(--foreground)",
        }),
        menu: (base) => ({ ...base, zIndex: 60 }),
      }}
    />
  );
};
