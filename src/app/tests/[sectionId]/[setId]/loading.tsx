export default function SetLoading() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Test Set</h2>
        <p className="text-slate-600">Preparing your questions...</p>
      </div>
    </div>
  );
}
