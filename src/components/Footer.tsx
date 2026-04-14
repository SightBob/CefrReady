import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#EAEAEA] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="bg-gradient-to-br from-primary-500 to-accent-500 p-1.5 rounded-lg">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-[#111]">CEFR Ready</span>
            </Link>
            <p className="text-sm text-[#AAAAAA] leading-relaxed">
              ฝึกทักษะภาษาอังกฤษตามมาตรฐาน CEFR<br />
              ครอบคลุมระดับ A1 ถึง C2
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold text-[#111] uppercase tracking-widest mb-3">เมนูหลัก</h3>
            <ul className="space-y-2">
              {[
                { href: '/tests', label: 'ข้อสอบ' },
                { href: '/progress', label: 'พัฒนาการ' },
                { href: '/must-know', label: 'Must Know' },
                { href: '/demo/focus-form', label: 'ทดลองทำข้อสอบ' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[#787774] hover:text-[#111] transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Exam Types */}
          <div>
            <h3 className="text-xs font-bold text-[#111] uppercase tracking-widest mb-3">ประเภทข้อสอบ</h3>
            <ul className="space-y-2">
              {[
                'Focus on Form',
                'Focus on Meaning',
                'Form & Meaning',
                'Listening',
              ].map((label) => (
                <li key={label} className="text-sm text-[#787774]">{label}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#EAEAEA] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[#AAAAAA]">
            © {year} CEFR Ready. สงวนลิขสิทธิ์.
          </p>
          <p className="text-xs text-[#AAAAAA]">
            พัฒนาเพื่อนักศึกษาไทย 🇹🇭
          </p>
        </div>
      </div>
    </footer>
  );
}
