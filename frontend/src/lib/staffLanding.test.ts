import { describe, expect, it } from 'vitest';
import type { StaffAdminSummary } from '@shared/types/staff';
import { selectPublishedStaff, sortStaffForLanding } from './staffLanding';

function staff(
  id: number,
  sortOrder: number,
  publicationConsent = true
): StaffAdminSummary {
  return {
    id,
    name: `운영진 ${id}`,
    position: '운영진',
    department: '컴퓨터공학과',
    admissionYear: 24,
    photoUrl: `/staff/${id}.webp`,
    introduction: null,
    activities: [],
    sortOrder,
    studentId: null,
    publicationConsent,
    publicationConsentedAt: publicationConsent ? '2026-07-31T00:00:00' : null,
  };
}

describe('운영진 랜딩 노출 목록', () => {
  it('인원수 제한 없이 관리자가 정한 순서대로 모두 노출한다', () => {
    const items = Array.from({ length: 9 }, (_, index) => staff(index + 1, 9 - index));

    expect(sortStaffForLanding(items).map((person) => person.id)).toEqual([
      9, 8, 7, 6, 5, 4, 3, 2, 1,
    ]);
  });

  it('관리자 미리보기에서는 공개 동의된 카드만 실제 랜딩 순서로 고른다', () => {
    const items = [staff(1, 3), staff(2, 1, false), staff(3, 2)];

    expect(selectPublishedStaff(items).map((person) => person.id)).toEqual([3, 1]);
  });
});
