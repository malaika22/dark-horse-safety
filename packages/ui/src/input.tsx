import * as React from "react";
import { cn } from "./lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelAction?: React.ReactNode;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      labelAction,
      error,
      hint,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? React.useId();
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined;

    return (
      <div className="flex w-full flex-col gap-2">
        {label || labelAction ? (
          <div className="flex items-center justify-between gap-3">
            {label ? (
              <label
                htmlFor={inputId}
                className="field-label"
              >
                {label}
              </label>
            ) : (
              <span />
            )}
            {labelAction}
          </div>
        ) : null}

        <div className="relative">
          {leftIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-foreground-muted">
              {leftIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              "field-placeholder h-11 w-full rounded-md border bg-surface-muted px-3.5 text-sm normal-case tracking-normal text-foreground sm:h-12",
              "transition-colors outline-none",
              "focus:border-border-focus focus:ring-1 focus:ring-border-focus",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error ? "border-border-error" : "border-transparent",
              leftIcon && "pl-11",
              rightIcon && "pr-11",
              className,
            )}
            {...props}
          />

          {rightIcon ? (
            <span className="absolute inset-y-0 right-3.5 flex items-center text-foreground">
              {rightIcon}
            </span>
          ) : null}
        </div>

        {error ? (
          <p
            id={`${inputId}-error`}
            className="text-xs font-semibold uppercase tracking-[0.08em] text-error"
            role="alert"
          >
            {error}
          </p>
        ) : hint ? (
          <p
            id={`${inputId}-hint`}
            className="text-xs uppercase tracking-[0.06em] text-foreground-muted"
          >
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
