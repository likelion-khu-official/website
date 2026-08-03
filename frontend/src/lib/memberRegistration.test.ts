import { describe, expect, it } from 'vitest';
import {
  BULK_MEMBER_PROMPT,
  BulkMemberValidationError,
  findMemberRegistrationConflict,
  MEMBER_ROLE_OPTIONS,
  parseBulkMembers,
} from './memberRegistration';
import type { MemberAdminSummary } from '@shared/types/member';

describe('BULK_MEMBER_PROMPT', () => {
  it('모든 역할의 한국어 이름과 코드를 안내한다', () => {
    for (const { value, label } of MEMBER_ROLE_OPTIONS) {
      expect(BULK_MEMBER_PROMPT).toContain(`${label}: "${value}"`);
    }
  });

  it('누락값을 지어내지 않고 JSON만 출력하도록 안내한다', () => {
    expect(BULK_MEMBER_PROMPT).toContain('추측하거나 만들어내지 마세요');
    expect(BULK_MEMBER_PROMPT).toContain('필요한 사전 질문만 번호를 붙여 한 번에 짧게');
    expect(BULK_MEMBER_PROMPT).toContain('최종 응답으로 JSON 배열만 출력하세요');
    expect(BULK_MEMBER_PROMPT).toContain('질문과 최종 JSON을 같은 응답에 섞지 마세요');
    expect(BULK_MEMBER_PROMPT).toContain('마크다운 코드블록');
  });
});

describe('parseBulkMembers', () => {
  it('유효한 JSON 배열을 등록 요청으로 정규화한다', () => {
    const result = parseBulkMembers(`
      [
        {
          "name": "  홍길동 ",
          "studentId": " 2099000001 ",
          "phone": " 01000000001 ",
          "cohort": 14,
          "roles": ["BACKEND", "PR_MEMBER"]
        }
      ]
    `);

    expect(result).toEqual([
      {
        name: '홍길동',
        studentId: '2099000001',
        phone: '01000000001',
        cohort: 14,
        roles: ['BACKEND', 'PR_MEMBER'],
      },
    ]);
  });

  it('JSON 문법 오류를 설명한다', () => {
    expect(() => parseBulkMembers('[{"name": "홍길동"}')).toThrow('JSON 문법이 올바르지 않아요');
  });

  it('잘못된 필드의 배열 순번과 이름을 설명한다', () => {
    expect(() =>
      parseBulkMembers(`
        [
          {
            "name": "첫째",
            "studentId": "2099000001",
            "phone": "01000000001",
            "cohort": 14,
            "roles": ["BACKEND"]
          },
          {
            "name": "둘째",
            "studentId": 2099000002,
            "phone": "01000000002",
            "cohort": 14,
            "roles": ["FRONTEND"]
          }
        ]
      `)
    ).toThrow('2번째 멤버의 studentId');
  });

  it('입력 배열 안의 중복 학번을 등록 전에 막는다', () => {
    expect(() =>
      parseBulkMembers(`
        [
          {
            "name": "첫째",
            "studentId": "2099000001",
            "phone": "01000000001",
            "cohort": 14,
            "roles": ["BACKEND"]
          },
          {
            "name": "둘째",
            "studentId": "2099000001",
            "phone": "01000000002",
            "cohort": 14,
            "roles": ["FRONTEND"]
          }
        ]
      `)
    ).toThrow('2번째 멤버의 studentId: 1번째 멤버와 학번이 중복돼요.');
  });

  it('허용되지 않은 역할 코드를 막는다', () => {
    expect(() =>
      parseBulkMembers(`
        [
          {
            "name": "홍길동",
            "studentId": "2099000001",
            "phone": "01000000001",
            "cohort": 14,
            "roles": ["UNKNOWN"]
          }
        ]
      `)
    ).toThrow(BulkMemberValidationError);
  });
});

describe('findMemberRegistrationConflict', () => {
  const existingMember: MemberAdminSummary = {
    id: 1,
    name: '기존부원',
    studentId: '2099000001',
    cohort: 14,
    roles: ['BACKEND'],
    emoji: '🦁',
    photoUrl: null,
    joinReason: null,
    department: null,
    publicationConsent: false,
    publicationConsentedAt: null,
    offboarded: false,
  };

  it('활동 중인 기존 부원과 같은 학번을 충돌로 표시한다', () => {
    expect(findMemberRegistrationConflict({ studentId: '2099000001', cohort: 15 }, [existingMember])).toContain(
      '기존부원 부원과 학번이 같아요'
    );
  });

  it('오프보딩 기록은 같은 기수일 때만 충돌로 표시한다', () => {
    const offboarded = { ...existingMember, offboarded: true };

    expect(findMemberRegistrationConflict({ studentId: '2099000001', cohort: 14 }, [offboarded])).toContain(
      '같은 학번·14기 기록'
    );
    expect(findMemberRegistrationConflict({ studentId: '2099000001', cohort: 15 }, [offboarded])).toBeNull();
  });
});
