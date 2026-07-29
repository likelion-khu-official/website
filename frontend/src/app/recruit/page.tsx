'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRecruitmentStatus } from '@/lib/useRecruitmentStatus';

// 지원폼(#152)이 아직 없어, 모집중일 때 방문자에게 보여줄 임시 안내다.
// 지원폼이 완성되면 이 페이지 내용을 실제 폼으로 교체한다(#151 PM 결정: 이슈 #154).
export default function RecruitPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen min-h-[100svh] items-center justify-center px-5 text-center">
          <p className="text-sm text-gray-400">불러오고 있어요…</p>
        </main>
      }
    >
      <RecruitContent />
    </Suspense>
  );
}

function RecruitContent() {
  const searchParams = useSearchParams();
  const preview = searchParams.get('preview') === '1';

  const { recruiting, checked } = useRecruitmentStatus(preview);

  if (!checked) {
    return (
      <main className="flex min-h-screen min-h-[100svh] items-center justify-center px-5 text-center">
        <p className="text-sm text-gray-400">불러오고 있어요…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen min-h-[100svh] flex-col items-center justify-center gap-3 px-5 text-center">
      {recruiting ? (
        <>
          <p className="text-white text-lg font-semibold">모집이 시작되었습니다!</p>
          <p className="text-sm text-gray-400">지원 방법은 곧 자세히 안내드릴게요. 조금만 기다려 주세요.</p>
        </>
      ) : (
        <p className="text-sm text-gray-400">지금은 모집 기간이 아니에요.</p>
      )}
    </main>
  );
}
