'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Member } from '@shared/types/member';
import type { ActivitiesByMember, MemberActivity } from '@/lib/memberActivity';
import { loadActivitiesByMember } from '@/lib/memberActivityLoader';
import { getMembers } from '@/lib/rosterApi';
import { cardColor } from '@/lib/roster';
import MemberDetailModal from './MemberDetailModal';

type Accent = readonly [string, string]; // [배경색, 글자색]

type OpenOptions = {
  // 로스터처럼 카드 색을 이미 아는 경우 넘긴다. 없으면 멤버 id로 색을 고른다.
  accent?: Accent;
  // 누른 요소의 화면상 위치 — 데스크탑에서 그 자리에서 모달이 확장돼 열리게 한다.
  originRect?: DOMRect | null;
  // 로스터처럼 활동을 이미 계산해 둔 경우 넘긴다. 없으면 provider가 클라이언트에서 지연 로드.
  activities?: MemberActivity[];
  activitiesIncomplete?: boolean;
};

type MemberModalContextValue = {
  // 이미 전체 Member를 갖고 있을 때(로스터·프로젝트 참여자·멘션 칩).
  openMember: (member: Member, options?: OpenOptions) => void;
  // id만 있을 때(블로그 작성자 등) — 공개 명단에서 해석해 연다. 없으면 조용히 무시.
  openMemberById: (memberId: number, options?: OpenOptions) => void;
};

const MemberModalContext = createContext<MemberModalContextValue | null>(null);

export function useMemberModal(): MemberModalContextValue {
  const context = useContext(MemberModalContext);
  if (!context) {
    throw new Error('useMemberModal은 MemberModalProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}

export default function MemberModalProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [accent, setAccent] = useState<Accent | undefined>(undefined);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [activities, setActivities] = useState<MemberActivity[]>([]);
  const [activitiesIncomplete, setActivitiesIncomplete] = useState(false);

  // 공개 명단·멤버별 활동을 한 번만 로드해 캐시한다(열 때마다 전체 재요청 방지).
  const membersRef = useRef<Promise<Member[]> | null>(null);
  const activitiesRef = useRef<Promise<{ activitiesByMember: ActivitiesByMember; incomplete: boolean }> | null>(null);
  // 늦게 도착한 비동기 결과가 이미 닫혔거나 다른 멤버로 바뀐 모달에 반영되지 않도록.
  const requestIdRef = useRef(0);

  const applyActivities = useCallback((memberId: number, requestId: number) => {
    if (!activitiesRef.current) {
      activitiesRef.current = loadActivitiesByMember().catch(() => {
        // 실패는 다음 열림에서 다시 시도할 수 있게 캐시를 비운다.
        activitiesRef.current = null;
        return { activitiesByMember: {} as ActivitiesByMember, incomplete: true };
      });
    }
    activitiesRef.current.then((result) => {
      if (requestIdRef.current !== requestId) return; // 그 사이 닫힘/다른 멤버
      setActivities(result.activitiesByMember[memberId] ?? []);
      setActivitiesIncomplete(result.incomplete);
    });
  }, []);

  const openMember = useCallback(
    (next: Member, options?: OpenOptions) => {
      const requestId = ++requestIdRef.current;
      setMember(next);
      setAccent(options?.accent ?? cardColor(Math.abs(next.id)));
      setOriginRect(options?.originRect ?? null);

      if (options?.activities) {
        setActivities(options.activities);
        setActivitiesIncomplete(options.activitiesIncomplete ?? false);
        return;
      }
      // 활동 미제공 → 빈 상태로 열고 지연 로드로 채운다.
      setActivities([]);
      setActivitiesIncomplete(false);
      applyActivities(next.id, requestId);
    },
    [applyActivities],
  );

  const openMemberById = useCallback(
    (memberId: number, options?: OpenOptions) => {
      if (!membersRef.current) {
        membersRef.current = getMembers('').catch(() => {
          membersRef.current = null;
          return [] as Member[];
        });
      }
      membersRef.current.then((members) => {
        const found = members.find((candidate) => candidate.id === memberId);
        // 비공개·오프보딩·없는 멤버면 조용히 무시. 있으면 openMember가 최신성(requestId)까지 처리.
        if (found) openMember(found, options);
      });
    },
    [openMember],
  );

  const close = useCallback(() => {
    requestIdRef.current++;
    setMember(null);
  }, []);

  const value = useMemo(() => ({ openMember, openMemberById }), [openMember, openMemberById]);

  return (
    <MemberModalContext.Provider value={value}>
      {children}
      <MemberDetailModal
        member={member}
        accent={accent}
        originRect={originRect}
        activities={activities}
        activitiesIncomplete={activitiesIncomplete}
        onClose={close}
      />
    </MemberModalContext.Provider>
  );
}
