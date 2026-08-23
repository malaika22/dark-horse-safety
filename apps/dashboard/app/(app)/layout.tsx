import type { ReactNode } from "react";
import { AppShell } from "@/features/app-shell/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
