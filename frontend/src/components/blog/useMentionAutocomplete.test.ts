import { describe, expect, it } from 'vitest';
import { findMentionQuery } from './useMentionAutocomplete';

describe('findMentionQuery', () => {
  it('공백 뒤 @ 다음의 쿼리를 잡고 @ 위치를 알려준다', () => {
    expect(findMentionQuery('이번엔 @홍')).toEqual({ query: '홍', atIndex: 4 });
  });

  it('문자열 맨 앞의 @도 잡는다(쿼리 없음)', () => {
    expect(findMentionQuery('@')).toEqual({ query: '', atIndex: 0 });
  });

  it('여는 괄호 뒤의 @도 경계로 인정한다', () => {
    expect(findMentionQuery('(@김')).toEqual({ query: '김', atIndex: 1 });
  });

  it('이메일처럼 단어 중간의 @는 잡지 않는다', () => {
    expect(findMentionQuery('me@example')).toBeNull();
  });

  it('@ 뒤에 공백이 오면(쿼리 종료) 잡지 않는다', () => {
    expect(findMentionQuery('@홍 님')).toBeNull();
  });

  it('마크다운 링크 문자가 들어오면 끊는다', () => {
    expect(findMentionQuery('[@홍](x)')).toBeNull();
  });
});
