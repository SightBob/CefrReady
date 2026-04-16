import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CEFR Ready — เตรียมพร้อมสอบ CEFR';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            marginBottom: '24px',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          ✨ ข้อสอบมาตรฐาน CEFR — A1 ถึง C2
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span>CEFR Ready</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            fontWeight: 500,
            color: '#93c5fd',
            marginTop: '16px',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          เตรียมพร้อมสอบ CEFR ได้ทุกทักษะ
        </div>

        {/* Features row */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '40px',
          }}
        >
          {['Focus on Form', 'Focus on Meaning', 'Listening'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '18px',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.4)',
            display: 'flex',
          }}
        >
          cefrready.com
        </div>
      </div>
    ),
    { ...size }
  );
}
