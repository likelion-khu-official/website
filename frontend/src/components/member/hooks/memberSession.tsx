'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { MemberAccount } from '@shared/types/member-auth';

/**
 * 로그인한 멤버 계정을 워크스페이스 전체에 내려주는 컨텍스트.
 * 셸(MemberShell)이 `/auth/me`를 한 번 조회해 채우고, 헤더·각 화면이 공유한다 —
 * 화면마다 getCurrentMember를 다시 부르던 중복을 없앤다.
 */
const MemberSessionContext = createContext<MemberAccount | null>(null);

export function MemberSessionProvider({
  member,
  children,
}: {
  member: MemberAccount | null;
  children: ReactNode;
}) {
  return <MemberSessionContext.Provider value={member}>{children}</MemberSessionContext.Provider>;
}

/** 로딩 중에는 null일 수 있다(헤더 이름처럼 있으면 좋은 곳에서 사용). */
export function useMemberSession(): MemberAccount | null {
  return useContext(MemberSessionContext);
}
