'use client';

import { useEffect, useState } from 'react';
import type { PublicRecruitmentStatusResponse } from '@shared/types/recruitment';

// 랜딩 Recruit 섹션이 쓰는 공개 모집 상태 조회(#151).
// 조회 실패(네트워크 오류·비정상 응답) 시엔 평소(모집 알림) 모드로 안전하게 유지한다.
export function useRecruitmentStatus() {
  const [recruiting, setRecruiting] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/recruitment/status')
      .then((res) => (res.ok ? (res.json() as Promise<PublicRecruitmentStatusResponse>) : null))
      .then((data) => {
        if (!cancelled && data) setRecruiting(data.open);
      })
      .catch(() => {
        // 조회 실패 시 평소(모집 알림) 모드로 안전하게 유지
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { recruiting, checked };
}
