'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MemberApiError } from '@/lib/memberApi';

type Options = {
  /**
   * 도메인별 에러 메시지 매핑(예: NOT_PARTICIPANT/404).
   * 문자열을 반환하면 그 메시지를, null이면 기본 처리를 쓴다.
   * 401·MUST_CHANGE_PASSWORD는 여기 오기 전에 로그인 리다이렉트로 처리된다.
   */
  mapError?: (err: MemberApiError) => string | null;
};

type Result<T> = {
  data: T | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  loading: boolean;
  error: string;
  reload: () => void;
};

/**
 * 멤버 화면 데이터 로딩의 공통 골격.
 * - 로딩/에러 상태 관리
 * - 401 또는 MUST_CHANGE_PASSWORD면 returnTo를 붙여 로그인으로 리다이렉트
 * - 그 외 에러는 (선택) mapError → 기본 메시지 순으로 노출
 *
 * loader는 렌더마다 새로 만들어져도 되도록 ref로 잡고, 재실행은 deps로 제어한다.
 */
export function useMemberResource<T>(
  loader: () => Promise<T>,
  deps: DependencyList = [],
  options: Options = {}
): Result<T> {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // loader·mapError는 렌더마다 새로 만들어지므로 ref로 최신값을 잡아둔다(렌더 중이 아니라
  // effect에서 동기화해야 react-hooks/refs 규칙을 지킨다). 재실행은 deps로만 제어한다.
  const loaderRef = useRef(loader);
  const mapErrorRef = useRef(options.mapError);
  useEffect(() => {
    loaderRef.current = loader;
    mapErrorRef.current = options.mapError;
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loaderRef.current();
      setData(result);
    } catch (err) {
      if (
        err instanceof MemberApiError &&
        (err.status === 401 || err.code === 'MUST_CHANGE_PASSWORD')
      ) {
        router.replace(`/member/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      const mapped = err instanceof MemberApiError ? mapErrorRef.current?.(err) ?? null : null;
      setError(mapped ?? (err instanceof Error ? err.message : '화면을 불러오지 못했어요.'));
    } finally {
      setLoading(false);
    }
  }, [router, pathname]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
    // deps가 바뀌면 다시 로드한다(예: 페이지 번호·projectId).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, setData, loading, error, reload: load };
}
