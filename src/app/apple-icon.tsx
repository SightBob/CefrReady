import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        borderRadius: '36px',
      }}>
        <svg width="180" height="180" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="14" fill="#2563EB" />
          <ellipse cx="20" cy="20" rx="14" ry="6" stroke="#93bbfd" strokeWidth="1" fill="none" />
          <ellipse cx="20" cy="20" rx="5" ry="14" stroke="#93bbfd" strokeWidth="1" fill="none" />
          <line x1="6" y1="15" x2="34" y2="15" stroke="#93bbfd" strokeWidth="0.8" />
          <line x1="6" y1="25" x2="34" y2="25" stroke="#93bbfd" strokeWidth="0.8" />
          <path d="M30 28 L36 34 L46 22" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
