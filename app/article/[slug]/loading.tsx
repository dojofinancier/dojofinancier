export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 w-3/4 bg-gray-200 rounded mb-4"></div>
            <div className="h-6 w-1/2 bg-gray-200 rounded"></div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
