'use client';

import { NextPage } from 'next';

const Page: NextPage = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-[#4F46E5] mb-2">
            🧠 MUST KNOW
          </h1>
          <p className="text-lg text-gray-500">
            ข้อมูลสำคัญที่ต้องรู้ก่อนสอบ (ต้องรู้ก่อนสอบ)
          </p>
        </header>

        <main>
          {/* 1. ระดับภาษา (Language Levels) */}
          <section className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-gray-100 hover:-translate-y-1 transition-transform">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 border-b-2 border-[#F9FAFB] pb-3">
              📌 ระดับภาษา (Language Levels)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#DBEAFE] text-[#1E40AF] p-4 rounded-xl text-center font-medium">
                <span className="text-2xl font-bold block mb-1">A1 – A2</span>
                Beginner (พื้นฐาน)
              </div>
              <div className="bg-[#E0E7FF] text-[#3730A3] p-4 rounded-xl text-center font-medium">
                <span className="text-2xl font-bold block mb-1">B1 – B2</span>
                Intermediate (ระดับกลาง)
              </div>
              <div className="bg-[#FEF3C7] text-[#92400E] p-4 rounded-xl text-center font-medium">
                <span className="text-2xl font-bold block mb-1">C1 – C2</span>
                Advanced (ระดับสูง)
              </div>
            </div>
          </section>

          {/* 2. เงื่อนไขสำคัญ (Important Conditions) */}
          <section className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-gray-100 hover:-translate-y-1 transition-transform">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 border-b-2 border-[#F9FAFB] pb-3">
              ⚠️ เงื่อนไขสำคัญ (ต้องรู้!)
            </h2>

            <div className="bg-[#FEF2F2] border-l-4 border-[#EF4444] p-6 rounded-lg mb-6">
              <div className="text-[#991B1B] font-semibold text-xl mb-2 flex items-center gap-2">
                👉 นักศึกษาทุกคนต้องมีระดับภาษาอย่างน้อย A2
              </div>
              <p className="text-[#7F1D1D]">เพื่อให้ผ่านเงื่อนไขการจบการศึกษา</p>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center">
              {/* กรณีไม่ผ่าน */}
              <div className="flex-1 min-w-[250px] bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] p-6 rounded-xl text-center">
                <div className="text-4xl mb-2">❌</div>
                <div className="font-bold">ต่ำกว่า A2</div>
                <div className="text-sm">ไม่ผ่านเงื่อนไขการจบ</div>
              </div>

              {/* กรณีผ่าน */}
              <div className="flex-1 min-w-[250px] bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7] p-6 rounded-xl text-center">
                <div className="text-4xl mb-2">✅</div>
                <div className="font-bold">A2 ขึ้นไป</div>
                <div className="text-sm">ผ่านเกณฑ์มหาวิทยาลัย</div>
              </div>
            </div>

            <div className="text-center mt-6 font-medium text-gray-700">
              💡 สรุปง่ายๆ: ต้องสอบให้ได้ <span className="text-[#10B981] font-bold">"A2 หรือสูงกว่า"</span> ถึงจะจบได้
            </div>
          </section>

          {/* 3. ระบบระดับของมหาลัย (E-Level) */}
          <section className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-gray-100 hover:-translate-y-1 transition-transform">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 border-b-2 border-[#F9FAFB] pb-3">
              🎓 ระบบระดับของมหาลัย (E-Level)
            </h2>
            <p className="text-gray-500 mb-6">
              ใช้ระดับ E1 – E5 ผลสอบจะกำหนดระดับที่ต้องเรียน
            </p>

            <div className="bg-[#EEF2FF] p-8 rounded-xl">
              <div className="flex gap-2 items-center flex-wrap justify-center">
                {['E1', 'E2', 'E3', 'E4', 'E5'].map((level, index) => (
                  <div key={level} className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md ${
                      index === 2 ? 'bg-[#4F46E5] text-white scale-110' : 'bg-white text-[#4F46E5]'
                    }`}>
                      {level}
                    </div>
                    {index < 4 && (
                      <div className="hidden sm:block absolute right-[-16px] top-1/2 -translate-y-1/2 w-3 h-[2px] bg-gray-300" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-white p-4 rounded-lg text-sm border border-dashed border-[#4F46E5]">
                <strong>ตัวอย่าง:</strong> ถ้าสอบได้ <span className="text-[#4F46E5] font-bold">E3</span><br />
                → ข้ามระดับ E1, E2, E3<br />
                → เริ่มเรียนที่ <span className="text-[#10B981] font-bold">E4</span>
              </div>
            </div>
          </section>

          {/* 4. โครงสร้างข้อสอบ (Exam Structure) */}
          <section className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-gray-100 hover:-translate-y-1 transition-transform">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 border-b-2 border-[#F9FAFB] pb-3">
              📝 โครงสร้างข้อสอบ (4 ส่วน)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <div className="text-2xl">📖</div>
                <div>
                  <h3 className="font-medium text-gray-800">Focus on Form</h3>
                  <p className="text-sm text-gray-500">Grammar (ไวยากรณ์)</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <div className="text-2xl">🧐</div>
                <div>
                  <h3 className="font-medium text-gray-800">Focus on Meaning</h3>
                  <p className="text-sm text-gray-500">ความเข้าใจเนื้อหา</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <div className="text-2xl">🔗</div>
                <div>
                  <h3 className="font-medium text-gray-800">Focus on Form & Meaning</h3>
                  <p className="text-sm text-gray-500">ผสมทั้งสองอย่าง</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <div className="text-2xl">🎧</div>
                <div>
                  <h3 className="font-medium text-gray-800">Listening</h3>
                  <p className="text-sm text-gray-500">ฟังแล้วตอบ</p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. การประกาศผล (Results) */}
          <section className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-gray-100 hover:-translate-y-1 transition-transform">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 border-b-2 border-[#F9FAFB] pb-3">
              ⚡ การประกาศผล
            </h2>
            <div className="text-center text-lg text-[#4F46E5] bg-[#EEF2FF] p-6 rounded-xl font-medium">
              สอบเสร็จ → รู้คะแนนทันที 🚀
              <span className="text-sm text-gray-500 mt-2 block">
                ระบบจะบอกระดับของคุณทันทีหลังจากทำข้อสอบเสร็จ
              </span>
            </div>
          </section>
        </main>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          © 2024 CEFR Ready. Minimal Design.
        </footer>
      </div>
    </div>
  );
};

export default Page;
