'use client';

export function LoadingSpinner({ text = "รอผลสอบสักครู่..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative w-14 h-14">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full bg-indigo-500 top-1/2 left-1/2"
            style={{
              transform: `rotate(${i * 45}deg) translate(22px) translate(-50%, -50%)`,
              animation: "spinner-fade 1s linear infinite",
              animationDelay: `${i * -0.125}s`,
            }}
          />
        ))}
      </div>
      <p className="text-indigo-600 font-bold text-[20px]">{text}</p>
      <style jsx>{`
        @keyframes spinner-fade {
          0% { opacity: 1; }
          100% { opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
