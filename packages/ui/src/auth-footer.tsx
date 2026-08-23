import * as React from "react";
import { brand } from "@dark-horse-safety/theme";
import { cn } from "./lib/cn";

export interface AuthFooterProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /** Optional line above the standard support copy (e.g. reset link expiry). */
  note?: React.ReactNode;
  /** Show ops-support footer copy. Default true. */
  showSupportCopy?: boolean;
  supportEmail?: string;
}

function splitSupportEmail(email: string): [string, string] {
  const dashIndex = email.indexOf("-");
  if (dashIndex === -1) {
    return [email, ""];
  }

  return [email.slice(0, dashIndex + 1), email.slice(dashIndex + 1)];
}

export function AuthFooter({
  className,
  children,
  note,
  showSupportCopy = true,
  supportEmail = brand.supportEmail,
  ...props
}: AuthFooterProps) {
  const [emailPrefix, emailSuffix] = splitSupportEmail(supportEmail);

  const defaultContent = (
    <p>
      This is an internal platform. Accounts are managed by
      <br />
      your administrator.
      <br />
      Having trouble? Contact{" "}
      <a href={`mailto:${supportEmail}`} className="auth-footer-link">
        {emailPrefix}
        {emailSuffix ? (
          <>
            <br />
            {emailSuffix}
          </>
        ) : null}
      </a>
    </p>
  );

  return (
    <footer
      className={cn("auth-footer-text w-full space-y-4", className)}
      {...props}
    >
      {note ? <p>{note}</p> : null}
      {showSupportCopy ? (children ?? defaultContent) : children}
    </footer>
  );
}
