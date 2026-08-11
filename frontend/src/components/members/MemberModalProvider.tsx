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
  // id 조회가 끝나기 전 스켈레톤 모달에 먼저 보여줄 이름.
  fallbackName?: string;
};

type MemberModalContextValue = {
  // 이미 전체 Member를 갖고 있을 때(로스터·프로젝트 참여자·멘션 칩).
  openMember: (member: Member, options?: OpenOptions) => void;
  // id만 있을 때(블로그 작성자 등) — 공개 명단에서 해석해 연다. 없으면 조용히 무시.
  openMemberById: (memberId: number, options?: OpenOptions) => void;
  // 공개 명단을 지연 로드한다(멘션 칩이 마운트 시 호출).
  ensureDirectory: () => void;
  // id로 현재 공개 멤버를 찾는다. 로드 전·없는 멤버면 undefined.
  resolveMember: (memberId: number) => Member | undefined;
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
  const [memberLoading, setMemberLoading] = useState(false);
  const [accent, setAccent] = useState<Accent | undefined>(undefined);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [activities, setActivities] = useState<MemberActivity[]>([]);
  const [activitiesIncomplete, setActivitiesIncomplete] = useState(false);

  // 공개 명단·멤버별 활동을 한 번만 로드해 캐시한다(열 때마다 전체 재요청 방지).
  const membersRef = useRef<Promise<Member[]> | null>(null);
  const activitiesRef = useRef<Promise<{ activitiesByMember: ActivitiesByMember; incomplete: boolean }> | null>(null);
  // 멘션 칩이 id→현재 멤버를 동기적으로 읽도록 명단을 상태로도 둔다(로드되면 소비자가 리렌더).
  const [directory, setDirectory] = useState<ReadonlyMap<number, Member> | null>(null);
  // 늦게 도착한 비동기 결과가 이미 닫혔거나 다른 멤버로 바뀐 모달에 반영되지 않도록.
  const requestIdRef = useRef(0);

  // 공개 명단을 지연 로드한다(멤버 모달 열기·멘션 해석이 공유하는 단일 로드).
  const ensureDirectory = useCallback(() => {
    if (!membersRef.current) {
      membersRef.current = getMembers('')
        .then((members) => {
          setDirectory(new Map(members.map((each) => [each.id, each])));
          return members;
        })
        .catch(() => {
          membersRef.current = null; // 다음 호출에서 재시도 가능
          return [] as Member[];
        });
    }
    return membersRef.current;
  }, []);

  const resolveMember = useCallback(
    (memberId: number) => directory?.get(memberId),
    [directory],
  );

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
      setMemberLoading(false);
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
      const cached = directory?.get(memberId);
      if (cached) {
        openMember(cached, options);
        return;
      }

      const requestId = ++requestIdRef.current;
      // 디렉터리 요청보다 모달을 먼저 연다. 실제 멤버 정보는 같은 자리에 도착하는 대로 채운다.
      setMember({
        id: memberId,
        name: options?.fallbackName ?? '멤버',
        roles: [],
        cohort: 0,
        emoji: '🦁',
        photoUrl: null,
        joinReason: null,
      });
      setMemberLoading(true);
      setAccent(options?.accent ?? cardColor(Math.abs(memberId)));
      setOriginRect(options?.originRect ?? null);
      setActivities([]);
      setActivitiesIncomplete(false);
      applyActivities(memberId, requestId);

      ensureDirectory().then((members) => {
        if (requestIdRef.current !== requestId) return;
        const found = members.find((candidate) => candidate.id === memberId);
        // 비공개·오프보딩·없는 멤버면 스켈레톤을 닫고, 있으면 현재 모달을 실제 정보로 교체한다.
        if (!found) {
          setMember(null);
          setMemberLoading(false);
          return;
        }
        setMember(found);
        setMemberLoading(false);
      });
    },
    [applyActivities, directory, ensureDirectory, openMember],
  );

  const close = useCallback(() => {
    requestIdRef.current++;
    setMember(null);
    setMemberLoading(false);
  }, []);

  const value = useMemo(
    () => ({ openMember, openMemberById, ensureDirectory, resolveMember }),
    [openMember, openMemberById, ensureDirectory, resolveMember],
  );

  return (
    <MemberModalContext.Provider value={value}>
      {children}
      <MemberDetailModal
        member={member}
        loading={memberLoading}
        accent={accent}
        originRect={originRect}
        activities={activities}
        activitiesIncomplete={activitiesIncomplete}
        onClose={close}
      />
    </MemberModalContext.Provider>
  );
}
