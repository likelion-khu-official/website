import { redirect } from 'next/navigation';

// 예전 모집 안내 URL을 북마크한 사용자를 현재 지원폼으로 보낸다.
export default async function RecruitPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const params = await searchParams;
  redirect(params.preview === '1' ? '/apply?preview=1' : '/apply');
}
