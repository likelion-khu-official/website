import { describe, expect, it } from 'vitest';
import type { Member, MemberRole } from '@shared/types/member';
import { isStaffMember, isStaffRole, mergeRoster } from './roster';

const STAFF_ROLES: MemberRole[] = [
  'PRESIDENT', 'VICE_PRESIDENT',
  'BACKEND_LEAD', 'FRONTEND_LEAD', 'DESIGN_LEAD', 'AI_LEAD',
  'PLANNING_HEAD', 'PLANNING_MEMBER',
  'PR_HEAD', 'PR_MEMBER',
];
const MEMBER_ROLES: MemberRole[] = ['BACKEND', 'FRONTEND', 'DESIGN', 'AI'];

function member(roles: MemberRole[]): Member {
  return {
    id: 1,
    name: '테스트',
    roles,
    cohort: 14,
    emoji: '🦁',
    photoUrl: null,
    joinReason: null,
  };
}

describe('isStaffRole', () => {
  it.each(STAFF_ROLES)('운영진 역할 %s은 true', (role) => {
    expect(isStaffRole(role)).toBe(true);
  });

  it.each(MEMBER_ROLES)('멤버 역할 %s은 false', (role) => {
    expect(isStaffRole(role)).toBe(false);
  });
});

describe('isStaffMember', () => {
  it('운영진 역할이 하나라도 있으면 운영진', () => {
    expect(isStaffMember(member(['PRESIDENT']))).toBe(true);
  });

  it('멤버 역할만 있으면 운영진 아님', () => {
    expect(isStaffMember(member(['BACKEND', 'AI']))).toBe(false);
  });

  it('겸직(멤버+운영진)이면 운영진', () => {
    expect(isStaffMember(member(['BACKEND', 'BACKEND_LEAD']))).toBe(true);
  });

  it('역할이 없으면 운영진 아님', () => {
    expect(isStaffMember(member([]))).toBe(false);
  });
});

describe('mergeRoster 정렬', () => {
  function named(name: string, roles: MemberRole[]): Member {
    return { ...member(roles), name };
  }

  it('운영진을 맨 위에(서열순), 일반 멤버는 그 뒤에 이름 가나다순으로 둔다', () => {
    const roster = mergeRoster(
      [
        named('박멤버', ['FRONTEND']),
        named('김멤버', ['BACKEND']),
        named('이부회장', ['VICE_PRESIDENT']),
        named('최회장', ['PRESIDENT']),
        named('한세션장', ['BACKEND_LEAD']),
      ],
      [],
    );
    expect(roster.map((m) => m.name)).toEqual([
      '최회장', '이부회장', '한세션장', // 운영진: 회장→부회장→세션장
      '김멤버', '박멤버', // 멤버: 가나다순
    ]);
  });

  it('겸직(멤버+운영진)은 운영진으로 취급해 대표 역할 서열로 앞에 온다', () => {
    const roster = mergeRoster(
      [named('가멤버', ['BACKEND']), named('겸직', ['BACKEND', 'PRESIDENT'])],
      [],
    );
    expect(roster.map((m) => m.name)).toEqual(['겸직', '가멤버']);
  });
});
