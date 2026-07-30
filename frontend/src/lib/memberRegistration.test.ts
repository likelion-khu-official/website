import { describe, expect, it } from 'vitest';
import {
  BulkMemberValidationError,
  parseBulkMembers,
} from './memberRegistration';

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
    expect(() => parseBulkMembers('[{"name": "홍길동"}')).toThrow(
      'JSON 문법이 올바르지 않아요'
    );
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
