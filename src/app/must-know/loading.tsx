export default function MustKnowLoading() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        
        <div className="flex gap-2 mb-8">
          <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-full w-20 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-full w-28 animate-pulse"></div>
        </div>

        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 animate-pulse">
              <div className="p-3 bg-gray-100 rounded-lg w-12 h-12 flex-shrink-0"></div>
              <div className="flex-1 w-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-5 bg-gray-100 rounded-full w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="flex gap-2 mt-4">
                   <div className="h-5 bg-gray-100 rounded md w-12"></div>
                   <div className="h-5 bg-gray-100 rounded md w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
