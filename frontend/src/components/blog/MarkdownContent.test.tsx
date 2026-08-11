import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownContent from './MarkdownContent';

// 멘션 칩은 provider 훅을 쓰므로 여기선 대체해 파싱만 검증한다.
vi.mock('./MemberMention', () => ({
  default: ({ memberId, fallback }: { memberId: number; fallback: string }) => (
    <span data-testid="mention" data-member-id={memberId}>
      {fallback}
    </span>
  ),
}));

describe('MarkdownContent 멘션 파싱', () => {
  it('mention: 링크는 인물 멘션으로 렌더하고 id·fallback을 넘긴다', () => {
    render(<MarkdownContent content="이번엔 [@홍길동](mention:42)님과 함께 했어요." />);

    const mention = screen.getByTestId('mention');
    expect(mention).toHaveAttribute('data-member-id', '42');
    expect(mention).toHaveTextContent('@홍길동');
  });

  it('일반 링크는 그대로 앵커로 렌더한다', () => {
    render(<MarkdownContent content="[깃허브](https://github.com)를 보세요." />);

    const link = screen.getByRole('link', { name: '깃허브' });
    expect(link).toHaveAttribute('href', 'https://github.com');
    expect(screen.queryByTestId('mention')).not.toBeInTheDocument();
  });
});
