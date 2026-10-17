/**
 * แถบแจ้งว่าโหลดข้อมูลไม่สำเร็จ พร้อมปุ่มลองใหม่
 *
 * สไตล์เดียวกับ error state ที่ admin/contacts/page.tsx ใช้อยู่แล้ว
 */
export default function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-4">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary text-sm py-2 px-4">
        ลองอีกครั้ง
      </button>
    </div>
  );
}