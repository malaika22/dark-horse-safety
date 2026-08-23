"use client";

import * as React from "react";
import { cn } from "./lib/cn";

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function OtpInput({
  length = 4,
  value = "",
  onChange,
  error,
  disabled,
  className,
  "aria-label": ariaLabel = "Verification code",
}: OtpInputProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const update = (next: string[]) => {
    onChange?.(next.join("").slice(0, length));
  };

  const focusAt = (index: number) => {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    update(next);
    if (char && index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      update(next);
      focusAt(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) focusAt(index - 1);
    if (event.key === "ArrowRight" && index < length - 1) focusAt(index + 1);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    const next = Array.from({ length }, (_, i) => pasted[i] ?? "");
    update(next);
    focusAt(Math.min(pasted.length, length - 1));
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div
        className="flex items-center justify-center gap-3"
        role="group"
        aria-label={ariaLabel}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={cn(
              "h-14 w-14 rounded-xl border bg-surface-elevated text-center text-xl font-semibold text-foreground",
              "outline-none transition-colors",
              "focus:border-border-focus focus:ring-1 focus:ring-border-focus",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error ? "border-border-error" : "border-border",
            )}
          />
        ))}
      </div>
      {error ? (
        <p className="text-center text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
