import type { Member } from '@shared/types/member';
import type { Staff } from '@shared/types/staff';

async function getPublicCollection<T>(path: string, baseUrl: string, label: string): Promise<T[]> {
  const response = await fetch(`${baseUrl}${path}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`${label}을 불러오지 못했어요. (${response.status})`);
  }

  return response.json() as Promise<T[]>;
}

export function getMembers(baseUrl: string) {
  return getPublicCollection<Member>('/api/members', baseUrl, '멤버 명단');
}

export function getStaff(baseUrl: string) {
  return getPublicCollection<Staff>('/api/staff', baseUrl, '운영진 명단');
}
