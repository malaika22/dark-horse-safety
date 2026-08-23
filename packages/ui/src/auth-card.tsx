import * as React from "react";
import { cn } from "./lib/cn";
import { BrandMark } from "./brand-mark";
import { Card } from "./card";
import { AuthFooter } from "./auth-footer";
import { Divider } from "./divider";

export interface AuthCardProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showDividerBeforeFooter?: boolean;
  className?: string;
  /** Inner padded scroll region (logo → footer) */
  bodyClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  brandClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  footerClassName?: string;
  dividerClassName?: string;
}

export function AuthCard({
  title,
  description,
  icon,
  children,
  footer,
  showDividerBeforeFooter = true,
  className,
  bodyClassName,
  contentClassName,
  headerClassName,
  brandClassName,
  titleClassName,
  descriptionClassName,
  footerClassName,
  dividerClassName,
}: AuthCardProps) {
  return (
    <Card
      padded={false}
      className={cn(
        "flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden",
        "sm:max-h-[calc(100dvh-2rem)]",
        "md:max-h-[calc(100dvh-4rem)]",
        "lg:max-h-[calc(100dvh-6rem)]",
        className,
      )}
    >
      {/* Card shell stays fixed; only this inner region scrolls */}
      <div
        className={cn(
          "scrollbar-hidden flex min-h-0 w-full flex-1 flex-col items-center overflow-x-hidden overflow-y-auto",
          "px-4 py-6 sm:px-8 sm:py-10 md:px-10",
          bodyClassName,
        )}
      >
        <BrandMark
          size={36}
          className={cn(
            "mb-4 shrink-0 sm:mb-6 sm:h-11 sm:w-11",
            brandClassName,
          )}
        />

        {icon ? (
          <div className="mb-3 shrink-0 sm:mb-5">{icon}</div>
        ) : null}

        <div
          className={cn(
            "mb-5 w-full shrink-0 space-y-2 text-center sm:mb-8",
            headerClassName,
          )}
        >
          <h1 className={cn("auth-title", titleClassName)}>{title}</h1>
          {description ? (
            <div
              className={cn(
                descriptionClassName ?? "auth-description",
              )}
            >
              {description}
            </div>
          ) : null}
        </div>

        <div className={cn("flex w-full flex-col gap-3", contentClassName)}>
          {children}
        </div>

        {footer !== null ? (
          <div
            className={cn("mt-5 w-full shrink-0 sm:mt-8", footerClassName)}
          >
            {showDividerBeforeFooter ? (
              <Divider
                className={cn("mb-4 sm:mb-6", dividerClassName)}
              />
            ) : null}
            {footer ?? <AuthFooter />}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <main
      className={cn(
        "flex h-dvh w-full items-center justify-center overflow-hidden bg-background",
        "px-3 py-[clamp(0.5rem,2.5vh,2.5rem)]",
        "sm:px-4 sm:py-[clamp(0.75rem,3vh,3rem)]",
        "md:py-[clamp(1rem,5vh,4rem)]",
        "lg:py-[clamp(1.5rem,7vh,5rem)]",
        className,
      )}
    >
      <div className="w-full max-w-[460px] shrink-0">{children}</div>
    </main>
  );
}
