import { NotFoundView } from "@/features/app-shell/not-found-view";

/** Unmatched / notFound() routes inside the authenticated app shell. */
export default function AppNotFound() {
  return <NotFoundView embedded />;
}
