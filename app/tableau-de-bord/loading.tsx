export default function DashboardLoading() {
  return (
    <div className="container mx-auto p-6 animate-in fade-in duration-200">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4 animate-pulse"></div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
