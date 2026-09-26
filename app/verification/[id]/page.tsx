import RecordDetailPage from '@/app/records/[id]/page';

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <RecordDetailPage params={params} />;
}
