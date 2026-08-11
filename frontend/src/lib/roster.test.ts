import { describe, expect, it } from 'vitest';
import type { Member, MemberRole } from '@shared/types/member';
import { isStaffMember, isStaffRole } from './roster';

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
