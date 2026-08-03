import type { MemberAdminSummary, MemberCreateRequest, MemberRole } from '@shared/types/member';

export const MEMBER_ROLE_OPTIONS: ReadonlyArray<{
  value: MemberRole;
  label: string;
}> = [
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

const ROLE_PROMPT_GUIDE = MEMBER_ROLE_OPTIONS.map(({ value, label }) => `- ${label}: "${value}"`).join('\n');

export const BULK_MEMBER_PROMPT = `당신은 멋쟁이사자처럼 경희대학교 멤버 명단을 관리자 사이트용 JSON으로 변환하는 도우미입니다.

이 프롬프트 다음에 제가 원본 명단을 붙여넣겠습니다. 원본은 표, 스프레드시트 복사본, 문장 등 어떤 형식일 수도 있습니다.

각 멤버를 아래 필드로 변환하세요.
- name: 이름. 문자열
- studentId: 학번. 앞자리 0이 사라지지 않도록 문자열
- phone: 전화번호. 원본 표기를 유지한 문자열
- cohort: 기수. 1 이상의 정수
- roles: 역할 코드가 한 개 이상 들어 있는 배열

사용할 수 있는 역할은 아래뿐입니다.
${ROLE_PROMPT_GUIDE}

대화 순서:
1. 제가 원본 명단을 보내면 먼저 모든 멤버에게 필수값이 있는지, 역할을 아래 코드로 확실히 바꿀 수 있는지 확인하세요.
2. 빠진 값이나 모호한 역할이 하나라도 있으면 JSON을 일부라도 출력하지 말고, 해결에 꼭 필요한 사전 질문만 번호를 붙여 한 번에 짧게 물어보세요.
3. 제가 질문에 답하면 명단 전체를 다시 확인하세요. 아직 해결되지 않은 문제가 있을 때만 같은 방식으로 최소한의 질문을 하세요.
4. 모든 문제가 해결되면 최종 응답으로 JSON 배열만 출력하세요. 질문과 최종 JSON을 같은 응답에 섞지 마세요.

반드시 지킬 변환 규칙:
1. 원본에 없는 이름, 학번, 전화번호, 기수, 역할을 추측하거나 만들어내지 마세요.
2. 한 사람이 여러 역할을 맡으면 roles 배열에 역할 코드를 모두 넣으세요.
3. 최종 응답에는 설명, 인사말, 요약, 마크다운 코드블록(\`\`\`)을 붙이지 마세요.
4. 최종 응답의 첫 글자는 [ 이고 마지막 글자는 ] 이어야 합니다.

출력 형태:
[
  {
    "name": "홍길동",
    "studentId": "2099000001",
    "phone": "01000000001",
    "cohort": 14,
    "roles": ["BACKEND"]
  }
]

지금은 설명하지 말고 제가 보내는 원본 멤버 명단을 기다리세요.`;

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

export function findMemberRegistrationConflict(
  candidate: Pick<MemberCreateRequest, 'studentId' | 'cohort'>,
  existingMembers: MemberAdminSummary[]
): string | null {
  const conflict = existingMembers.find(
    (member) => member.studentId === candidate.studentId && (!member.offboarded || member.cohort === candidate.cohort)
  );

  if (!conflict) return null;
  if (conflict.offboarded) {
    return `같은 학번·${candidate.cohort}기 기록이 이미 있어요.`;
  }
  return `${conflict.name} 부원과 학번이 같아요.`;
}
