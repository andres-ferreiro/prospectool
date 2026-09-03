"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check } from "lucide-react";
import { normalizeSpanish } from "@/lib/scian/groups";

interface Option {
  value: string;
  label: string;
}

interface SimpleComboboxProps {
  items: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  disabled?: boolean;
}

// Generic single-select searchable combobox — used for the Estado and
// Municipio pickers so every input in the advanced search drawer behaves
// the same way (type to filter, pick one), not just the category tree.
export function SimpleCombobox({ items, value, onChange, placeholder, disabled }: SimpleComboboxProps) {
  const codes = items.map((i) => i.value);
  const labelFor = (code: string) => items.find((i) => i.value === code)?.label ?? code;

  return (
    <Combobox.Root<string>
      items={codes}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      itemToStringLabel={labelFor}
      filter={(itemValue: string, q: string) => normalizeSpanish(labelFor(itemValue)).includes(normalizeSpanish(q))}
    >
      <Combobox.Input
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 w-full rounded-xl border-0 bg-background px-4 text-base shadow-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 dark:bg-input md:text-[15px]"
      />

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-50 w-[var(--anchor-width)]">
          <Combobox.Popup className="max-h-60 overflow-y-auto rounded-xl border border-border/50 bg-popover shadow-soft">
            <Combobox.Empty className="px-2.5 py-2 text-sm text-muted-foreground">Sin resultados.</Combobox.Empty>
            <Combobox.List>
              {(code: string) => (
                <Combobox.Item
                  key={code}
                  value={code}
                  className="flex cursor-default items-center gap-2 px-3 py-2 text-sm outline-none hover:bg-muted data-[highlighted]:bg-muted"
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    <Combobox.ItemIndicator>
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </Combobox.ItemIndicator>
                  </span>
                  <span className="min-w-0 flex-1 truncate">{labelFor(code)}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
