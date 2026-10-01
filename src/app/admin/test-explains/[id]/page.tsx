import { notFound } from 'next/navigation';
import TestExplainEditor from '@/components/admin/TestExplainEditor';

export default async function EditTestExplainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const explainId = Number(id);
  if (!Number.isInteger(explainId) || explainId <= 0) notFound();
  return <TestExplainEditor explainId={explainId} mode="edit" />;
}
