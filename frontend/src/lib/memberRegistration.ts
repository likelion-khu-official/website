import type { MemberCreateRequest, MemberRole } from '@shared/types/member';

export const MEMBER_ROLE_OPTIONS: ReadonlyArray<{ value: MemberRole; label: string }> = [
  { value: 'PRESIDENT', label: '회장' },
  { value: 'VICE_PRESIDENT', label: '부회장' },
  { value: 'BACKEND_LEAD', label: '백엔드 세션장' },
  { value: 'FRONTEND_LEAD', label: '프론트엔드 세션장' },
  { value: 'DESIGN_LEAD', label: '디자인 세션장' },
  { value: 'AI_LEAD', label: 'AI 세션장' },
  { value: 'PLANNING_HEAD', label: '기획부장' },
  { value: 'PLANNING_MEMBER', label: '기획부원' },
  { value: 'PR_HEAD', label: '홍보부장' },
  { value: 'PR_MEMBER', label: '홍보부원' },
  { value: 'BACKEND', label: '백엔드' },
  { value: 'FRONTEND', label: '프론트엔드' },
  { value: 'DESIGN', label: '디자인' },
  { value: 'AI', label: 'AI' },
];

const ROLE_VALUES = new Set<MemberRole>(MEMBER_ROLE_OPTIONS.map(({ value }) => value));
const ROLE_LABELS = new Map(MEMBER_ROLE_OPTIONS.map(({ value, label }) => [value, label]));

export const BULK_MEMBER_EXAMPLE = JSON.stringify(
  [
    {
      name: '홍길동',
      studentId: '2099000001',
      phone: '01000000001',
      cohort: 14,
      roles: ['BACKEND'],
    },
    {
      name: '김멋사',
      studentId: '2099000002',
      phone: '01000000002',
      cohort: 14,
      roles: ['FRONTEND', 'PR_MEMBER'],
    },
  ],
  null,
  2
);

export class BulkMemberValidationError extends Error {}

function fieldError(index: number, field: string, message: string): never {
  throw new BulkMemberValidationError(`${index + 1}번째 멤버의 ${field}: ${message}`);
}

function requiredString(value: unknown, index: number, field: string, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fieldError(index, field, `${label}을(를) 문자열로 입력해주세요.`);
  }
  return value.trim();
}

export function parseBulkMembers(input: string): MemberCreateRequest[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new BulkMemberValidationError('JSON 문법이 올바르지 않아요. 괄호와 쉼표를 확인해주세요.');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new BulkMemberValidationError('멤버 객체가 들어 있는 JSON 배열을 한 명 이상 입력해주세요.');
  }

  const seenStudentIds = new Map<string, number>();

  return parsed.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      fieldError(index, 'member', '객체 형식으로 입력해주세요.');
    }

    const record = item as Record<string, unknown>;
    const name = requiredString(record.name, index, 'name', '이름');
    const studentId = requiredString(record.studentId, index, 'studentId', '학번');
    const phone = requiredString(record.phone, index, 'phone', '전화번호');

    if (typeof record.cohort !== 'number' || !Number.isInteger(record.cohort) || record.cohort <= 0) {
      fieldError(index, 'cohort', '기수를 1 이상의 정수로 입력해주세요.');
    }

    if (!Array.isArray(record.roles) || record.roles.length === 0) {
      fieldError(index, 'roles', '역할 코드를 한 개 이상 배열로 입력해주세요.');
    }

    const roles = record.roles.map((role) => {
      if (typeof role !== 'string' || !ROLE_VALUES.has(role as MemberRole)) {
        fieldError(index, 'roles', `허용되지 않은 역할 코드 ${JSON.stringify(role)}예요.`);
      }
      return role as MemberRole;
    });

    const previousIndex = seenStudentIds.get(studentId);
    if (previousIndex !== undefined) {
      fieldError(index, 'studentId', `${previousIndex + 1}번째 멤버와 학번이 중복돼요.`);
    }
    seenStudentIds.set(studentId, index);

    return { name, studentId, phone, cohort: record.cohort, roles };
  });
}

export function memberRoleLabel(role: MemberRole): string {
  return ROLE_LABELS.get(role) ?? role;
}
