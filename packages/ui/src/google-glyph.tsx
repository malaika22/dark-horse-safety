import * as React from "react";
import { cn } from "./lib/cn";

export function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className={cn(className)}
      aria-hidden
    >
      <path
        fill="#EA4335"
        d="M9 7.2v3.5h4.9c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H9z"
      />
      <path
        fill="#34A853"
        d="M4.1 10.7l-.7.5-2.3 1.8C2.6 15.7 5.5 18 9 18c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z"
      />
      <path
        fill="#4A90E2"
        d="M1.1 5.3C.4 6.7 0 8.3 0 10s.4 3.3 1.1 4.7l3-2.3C3.8 11.5 3.6 10.8 3.6 10c0-.8.2-1.5.5-2.2l-3-2.5z"
      />
      <path
        fill="#FBBC05"
        d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.4.9 11.4 0 9 0 5.5 0 2.6 2.3 1.1 5.3l3 2.5C4.9 5.1 6.8 3.6 9 3.6z"
      />
    </svg>
  );
}
