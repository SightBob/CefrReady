export default function ExamLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <h2 className="mb-2 text-xl font-bold text-slate-900">กำลังโหลดข้อสอบ</h2>
        <p className="text-slate-600">เตรียมคำถามของคุณ...</p>
      </div>
    </div>
  );
}
