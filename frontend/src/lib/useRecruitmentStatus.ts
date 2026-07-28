'use client';

import { useEffect, useState } from 'react';
import type { PublicRecruitmentStatusResponse } from '@shared/types/recruitment';

// 랜딩(Recruit 섹션)과 /recruit 페이지가 공통으로 쓰는 공개 모집 상태 조회(#151).
// skip=true면 조회 자체를 건너뛰고 즉시 모집중으로 취급한다 — /recruit?preview=1 용.
// 조회 실패(네트워크 오류·비정상 응답) 시엔 평소(모집 알림) 모드로 안전하게 유지한다.
export function useRecruitmentStatus(skip = false) {
  const [recruiting, setRecruiting] = useState(skip);
  const [checked, setChecked] = useState(skip);

  useEffect(() => {
    if (skip) return;
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
  }, [skip]);

  return { recruiting, checked };
}
