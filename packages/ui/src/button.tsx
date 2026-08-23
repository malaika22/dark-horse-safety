import * as React from "react";
import { cn } from "./lib/cn";

export type ButtonVariant = "primary" | "secondary" | "glass" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary-surface",
  secondary:
    "border-[0.97px] border-border-strong bg-surface-strong text-foreground hover:bg-surface-elevated active:bg-surface-muted",
  glass: "btn-glass-surface",
  ghost:
    "border-[0.97px] border-transparent bg-transparent text-foreground hover:bg-surface-muted",
  danger:
    "border-[0.97px] border-transparent bg-accent text-accent-foreground hover:bg-accent/90",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = true,
      type = "button",
      disabled,
      leftIcon,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "btn-base inline-flex cursor-pointer items-center uppercase transition-[filter,box-shadow,background-color,backdrop-filter]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-40",
          leftIcon ? "justify-between" : "justify-center",
          variant === "glass"
            ? null
            : "font-bold tracking-[0.08em]",
          variantClasses[variant],
          fullWidth && "w-full max-w-[380px]",
          className,
        )}
        data-size={size}
        {...props}
      >
        {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
        <span className={cn("min-w-0", leftIcon ? "flex-1 text-center" : null)}>
          {children}
        </span>
        {leftIcon ? (
          <span className="invisible shrink-0" aria-hidden>
            {leftIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

Button.displayName = "Button";
