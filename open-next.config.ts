import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * Cloudflare Workers adapter สำหรับ Next.js (staging)
 *
 * ยังไม่เปิด incremental cache / R2 cache ในสไปก์แรก — เปิดหลังพิสูจน์ว่า
 * หน้าเว็บ + API ทำงานครบก่อน (ต้องมี R2 bucket + binding เพิ่ม)
 */
export default defineCloudflareConfig({});
