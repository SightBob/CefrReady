'use client';

import { useParams } from 'next/navigation';
import NodeContentBuilder from '@/components/admin/NodeContentBuilder';

export default function NodeContentBuilderPage() {
  const params = useParams();
  const nodeId = Number(params.id);

  if (!Number.isInteger(nodeId)) {
    return <div className="p-8 text-sm text-rose-600">ไม่พบ Node ที่ต้องการ</div>;
  }

  return <NodeContentBuilder nodeId={nodeId} />;
}
