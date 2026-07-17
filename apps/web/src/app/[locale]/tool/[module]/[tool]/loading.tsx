import { Skeleton } from "@omnio/ui";

/** Route-level loading state — mirrors the ToolShell frame so navigation feels instant. */
export default function ToolLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
