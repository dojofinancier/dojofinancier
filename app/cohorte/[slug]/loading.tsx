import { Skeleton } from "@/components/ui/skeleton";

export default function CohortLoading() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Hero section skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Content area */}
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
