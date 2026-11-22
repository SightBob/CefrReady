import openNextWorker from './.open-next/worker.js';

/**
 * Worker entry ของ Cloudflare (override `main` ใน wrangler.jsonc)
 *
 * ทำไมต้องมีไฟล์นี้: worker ที่ OpenNext สร้างให้ export แค่ `fetch` — Cloudflare
 * Cron Trigger ต้องมี `scheduled` ไม่งั้น trigger วิ่งแล้ว error ทุกคืน
 *
 * งานเดียว: ยิง endpoint retention ที่มีอยู่แล้วผ่าน HTTP (มี CRON_SECRET กันไว้)
 * ไม่ย้าย logic มาไว้ที่นี่ — route เดิมยังรันมือ/ยิงจากที่อื่นได้เหมือนเดิม
 */
export default {
  fetch: openNextWorker.fetch,

  async scheduled(_event, env, ctx) {
    const url = `${env.NEXTAUTH_URL}/api/cron/ai-tutor-retention`;
    ctx.waitUntil(
      fetch(url, { headers: { Authorization: `Bearer ${env.CRON_SECRET ?? ''}` } })
        .then((res) => console.log('[cron] ai-tutor-retention', res.status))
        .catch((error) => console.error('[cron] ai-tutor-retention failed', error))
    );
  },
};
