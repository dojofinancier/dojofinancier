import { Skeleton } from "@/components/ui/skeleton";

export default function CohortLearningLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-64 border-r flex-col p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-3/4 ml-4" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Breadcrumb */}
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Title */}
        <Skeleton className="h-10 w-2/3" />

        {/* Video player placeholder */}
        <Skeleton className="h-96 w-full rounded-lg" />

        {/* Description */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
