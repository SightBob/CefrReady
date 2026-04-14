import Link from 'next/link';
import { ArrowLeft, BookX } from 'lucide-react';

export default function ArticleNotFound() {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
      <div className="max-w-md w-full px-6 text-center">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookX className="w-10 h-10 text-stone-400" />
        </div>
        
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4 tracking-tight">
          Article Not Found
        </h1>
        
        <p className="text-stone-600 mb-10 leading-relaxed">
          ไม่พบบทความที่คุณกำลังพยายามเข้าถึง อาจถูกเปลี่ยนชื่อ ลบไปแล้ว หรือคุณอาจพิมพ์ URL ผิด
        </p>
        
        <Link 
          href="/must-know"
          className="inline-flex items-center justify-center px-6 py-3 bg-stone-900 text-white font-medium rounded-full hover:bg-stone-800 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับไปหน้าห้องสมุด
        </Link>
      </div>
    </div>
  );
}
