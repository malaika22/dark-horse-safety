import * as React from "react";
import { cn } from "./lib/cn";

export interface BrandMarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
  /** Defaults to `/brand/logo.png` (served from each app's public folder) */
  src?: string;
}

/** Dark Horse Safety logo */
export function BrandMark({
  size = 44,
  src = "/brand/logo.png",
  className,
  alt = "Dark Horse Safety",
  ...props
}: BrandMarkProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md object-contain", className)}
      {...props}
    />
  );
}
