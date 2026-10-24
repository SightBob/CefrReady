import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    // เทสที่ต่อฐานข้อมูลจริง (Neon) อาจช้ากว่า 5 วินาทีตอนรันเต็ม/ขนานหลาย worker
    // → ให้เวลา 15 วินาที (ค่า default 5 วินาทีทำให้เทสล้มแบบไม่ประมาณใต้ load)
    testTimeout: 15000,
    // เจาะจง src เท่านั้น — ค่า default ไปจับ test ใน .freebuff/ ซึ่งเป็น
    // เครื่องมือ local ที่ gitignore ไว้ แล้วทำให้ npm test แดงทั้งที่โค้ดจริงผ่าน
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.freebuff/**',
      '**/.omc/**',
      'tmp/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
});
