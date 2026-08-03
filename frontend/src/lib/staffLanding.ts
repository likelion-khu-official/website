import type { Staff, StaffAdminSummary } from '@shared/types/staff';

export function sortStaffForLanding<T extends Staff>(staff: readonly T[]): T[] {
  return [...staff].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

export function selectPublishedStaff<T extends StaffAdminSummary>(staff: readonly T[]): T[] {
  return sortStaffForLanding(staff.filter((person) => person.publicationConsent));
}
