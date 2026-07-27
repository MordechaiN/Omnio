import { NotFoundView } from "@/components/shell/not-found-view";

/** Explicit `notFound()` calls inside a matched route land here. */
export default function NotFound() {
  return <NotFoundView />;
}
