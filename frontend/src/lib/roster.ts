import type { Member, MemberRole } from '@shared/types/member';
import type { Staff } from '@shared/types/staff';

// 멤버 카드 배경·글자 색 쌍 [background, foreground]. 그리드 순서(colorIndex)로 순환한다.
// 카드와 상세 모달이 같은 색 정체성을 쓰도록 단일 출처로 둔다.
export const CARD_COLORS: readonly (readonly [string, string])[] = [
  ['#f47f83', '#111111'], ['#4b268d', '#ffffff'], ['#58f34f', '#111111'], ['#ff2424', '#111111'],
  ['#050505', '#ffffff'], ['#f7f7f3', '#111111'], ['#fff431', '#111111'], ['#c9ff8a', '#111111'],
  ['#ff0064', '#ffffff'], ['#ffdeaf', '#111111'], ['#1d3e7c', '#ffffff'], ['#8d35cb', '#ffffff'],
  ['#ffaa51', '#111111'], ['#555555', '#ffffff'], ['#ffb400', '#111111'], ['#ca2f36', '#ffffff'],
  ['#00b89c', '#111111'], ['#3978e9', '#ffffff'], ['#c9b6ff', '#111111'], ['#ff8c6b', '#111111'],
  ['#237a3b', '#ffffff'], ['#47dde8', '#111111'], ['#731c45', '#ffffff'], ['#f05587', '#111111'],
  ['#3e3acb', '#ffffff'], ['#8dd6ff', '#111111'], ['#b7ef43', '#111111'], ['#ff9c96', '#111111'],
  ['#7d451d', '#ffffff'], ['#63e8c6', '#111111'], ['#743a77', '#ffffff'], ['#e2ba36', '#111111'],
  ['#e83d63', '#ffffff'], ['#536b91', '#ffffff'], ['#e9cfa7', '#111111'],
] as const;

export function cardColor(index: number): readonly [string, string] {
  return CARD_COLORS[index % CARD_COLORS.length];
}

// MemberRole → 한국어 라벨.
// MemberCard 표시와 staff.position 역매핑이 공유하는 단일 출처(중복 정의로 인한 drift 방지).
export const ROLE_LABELS: Record<MemberRole, string> = {
  PRESIDENT: '회장',
  VICE_PRESIDENT: '부회장',
  BACKEND_LEAD: '백엔드 세션장',
  FRONTEND_LEAD: '프론트엔드 세션장',
  DESIGN_LEAD: '디자인 세션장',
  AI_LEAD: 'AI 세션장',
  PLANNING_HEAD: '기획부장',
  PLANNING_MEMBER: '기획부원',
  PR_HEAD: '홍보부장',
  PR_MEMBER: '홍보부원',
  BACKEND: '백엔드',
  FRONTEND: '프론트엔드',
  DESIGN: '디자인',
  AI: 'AI',
};

const stripSpace = (value: string) => value.replace(/\s+/g, '');

// 라벨 길이 내림차순: "백엔드 세션장"이 "백엔드"보다, "부회장"이 "회장"보다 먼저 매칭되게 한다.
const LABEL_TO_ROLE: [string, MemberRole][] = (Object.entries(ROLE_LABELS) as [MemberRole, string][])
  .map(([role, label]) => [stripSpace(label), role] as [string, MemberRole])
  .sort((left, right) => right[0].length - left[0].length);

// staff.position(자유 문자열)을 MemberCard가 쓰는 MemberRole로 역매핑한다.
// 공백 차이는 무시하고, 정확 일치 → 부분 포함(긴 라벨 우선) 순으로 찾는다.
// 어느 라벨과도 안 맞으면 운영진 기본값(기획부원)으로 둔다 — 실제 직함은 모두 위 라벨과 일치한다.
export function positionToRole(position: string): MemberRole {
  const normalized = stripSpace(position);
  for (const [label, role] of LABEL_TO_ROLE) {
    if (normalized === label) return role;
  }
  for (const [label, role] of LABEL_TO_ROLE) {
    if (normalized.includes(label)) return role;
  }
  return 'PLANNING_MEMBER';
}

// staff 레코드를 MemberCard가 그릴 수 있는 Member 형태로 변환한다.
// id는 음수로 둬서(멤버 id는 양수) 통합 그리드의 React key가 멤버와 충돌하지 않게 한다.
// staff는 항상 photoUrl이 있어 emoji는 실제로 쓰이지 않지만 타입 완결을 위해 채운다.
export function staffToMember(staff: Staff): Member {
  return {
    id: -staff.id,
    name: staff.name,
    roles: [positionToRole(staff.position)],
    cohort: 14,
    emoji: '🦁',
    photoUrl: staff.photoUrl,
    joinReason: staff.introduction,
  };
}

// members + staff를 하나의 로스터로 합친다.
// 공개 API가 studentId를 노출하지 않아 두 테이블의 동일 인물은 이름으로만 매칭할 수 있다.
// 멤버로 이미 있는 사람은 원본 Member(운영진 role·joinReason 포함)를 유지하고,
// staff에만 있는 인물(예: 멤버 테이블에 없는 회장)만 변환해 뒤에 덧붙인다.
export function mergeRoster(members: Member[], staff: Staff[]): Member[] {
  const memberNames = new Set(members.map((member) => member.name));
  const staffOnly = staff
    .filter((person) => !memberNames.has(person.name))
    .map(staffToMember);
  return [...members, ...staffOnly];
}
