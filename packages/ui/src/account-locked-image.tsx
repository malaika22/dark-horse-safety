import * as React from "react";
import { cn } from "./lib/cn";

export interface AccountLockedImageProps
  extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

/** Warning / account-locked glyph — gray circle with black exclamation */
export function AccountLockedImage({
  size = 56,
  className,
  ...props
}: AccountLockedImageProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
      {...props}
    >
      <circle cx="28" cy="28" r="28" fill="#959597" />
      <path
        d="M28 12c1.8 0 3.2 1.5 3.1 3.3l-.8 16.2c-.1 1.4-1.2 2.5-2.6 2.5h-.1c-1.4 0-2.5-1.1-2.6-2.5l-.8-16.2C24.8 13.5 26.2 12 28 12Z"
        fill="#000000"
      />
      <circle cx="28" cy="42.5" r="3.5" fill="#000000" />
    </svg>
  );
}
