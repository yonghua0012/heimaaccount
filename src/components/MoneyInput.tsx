import type { RefObject } from "react";

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function MoneyInput({ value, onChange, inputRef }: MoneyInputProps) {
  return (
    <label className="field money-field">
      <span>金额</span>
      <div className="money-input-wrap">
        <span aria-hidden="true">¥</span>
        <input
          ref={inputRef}
          aria-label="金额"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
        />
      </div>
    </label>
  );
}
