import type { Metadata } from "next";
import { NotFoundView } from "@/features/app-shell/not-found-view";

export const metadata: Metadata = {
  title: "Page not found | Dark Horse Force",
};

/** Global unmatched routes (outside nested layouts). */
export default function GlobalNotFound() {
  return <NotFoundView />;
}
