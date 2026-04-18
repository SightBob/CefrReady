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
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #0284c7, #0369a1)', // primary-600 to primary-700
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20%',
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        C
      </div>
    ),
    {
      ...size,
    }
  );
}
