"use client";

import { useMemo } from "react";
import type { WheelPickerOption } from "@/components/wheel-picker";
import { WheelPicker, WheelPickerWrapper } from "@/components/wheel-picker";

interface TimeWheelPickerProps {
  /** 24h "HH:mm". */
  value: string;
  onChange: (value: string) => void;
  /** Overrides WheelPickerWrapper's own card styling (border/bg/width) — used
   *  for the mobile inline placement, which sits directly in the drawer's
   *  flow rather than inside a floating Popover that already provides one. */
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const HOUR_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 12 }, (_, i) => ({
  label: pad(i + 1),
  value: i + 1,
}));

const MINUTE_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 60 }, (_, i) => ({
  label: pad(i),
  value: i,
}));

const MERIDIEM_OPTIONS: WheelPickerOption[] = [
  { label: "a.m.", value: "AM" },
  { label: "p.m.", value: "PM" },
];

function to24h(hour12: number, minute: number, meridiem: "AM" | "PM"): string {
  let hour24 = hour12 % 12;
  if (meridiem === "PM") hour24 += 12;
  return `${pad(hour24)}:${pad(minute)}`;
}

export function TimeWheelPicker({ value, onChange, className }: TimeWheelPickerProps) {
  const { hour12, minute, meridiem } = useMemo(() => {
    const [h, m] = value.split(":").map(Number);
    const meridiem: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12, minute: m, meridiem };
  }, [value]);

  return (
    <WheelPickerWrapper className={className}>
      <WheelPicker options={HOUR_OPTIONS} value={hour12} onValueChange={(h) => onChange(to24h(h, minute, meridiem))} infinite />
      <WheelPicker
        options={MINUTE_OPTIONS}
        value={minute}
        onValueChange={(m) => onChange(to24h(hour12, m, meridiem))}
        infinite
      />
      <WheelPicker
        options={MERIDIEM_OPTIONS}
        value={meridiem}
        onValueChange={(next) => onChange(to24h(hour12, minute, next as "AM" | "PM"))}
      />
    </WheelPickerWrapper>
  );
}
