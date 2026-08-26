"use client";

import * as React from "react";
import { Input, type InputProps } from "./input";

function EyeIcon({ open }: { open: boolean }) {
  /* Figma: solid filled eye with open circular pupil */
  const eye = (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 4.5C6.2 4.5 2.1 9.1.75 12 2.1 14.9 6.2 19.5 12 19.5s9.9-4.6 11.25-7.5C21.9 9.1 17.8 4.5 12 4.5zm0 10.75a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5z"
      fill="currentColor"
    />
  );

  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        {eye}
        <path
          d="M3.5 3.5l17 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {eye}
    </svg>
  );
}

export type PasswordInputProps = Omit<InputProps, "type" | "rightIcon">;

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput(props, ref) {
  const [visible, setVisible] = React.useState(false);

  return (
    <Input
      ref={ref}
      {...props}
      type={visible ? "text" : "password"}
      rightIcon={
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-foreground transition-opacity hover:opacity-70"
          onClick={() => setVisible((v) => !v)}
        >
          <EyeIcon open={visible} />
        </button>
      }
    />
  );
});
