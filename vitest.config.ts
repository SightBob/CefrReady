import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    // เจาะจง src เท่านั้น — ค่า default ไปจับ test ใน .freebuff/ ซึ่งเป็น
    // เครื่องมือ local ที่ gitignore ไว้ แล้วทำให้ npm test แดงทั้งที่โค้ดจริงผ่าน
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.freebuff/**',
      '**/.omc/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
});
