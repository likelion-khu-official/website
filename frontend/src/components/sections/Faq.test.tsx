import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Faq from './Faq';

describe('Faq', () => {
  it('질문 여섯 개를 번호형 아코디언으로 제공한다', () => {
    const { container } = render(<Faq />);

    expect(container.querySelectorAll('details')).toHaveLength(6);
    expect(container.querySelectorAll('summary')).toHaveLength(6);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('06')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /궁금한 점부터/ })).toBeInTheDocument();
  });

  it('질문을 누르면 같은 항목 안에서 답변을 펼친다', async () => {
    const user = userEvent.setup();
    const { container } = render(<Faq />);
    const firstDetails = container.querySelector('details');
    const firstSummary = container.querySelector('summary');

    expect(firstDetails).not.toHaveAttribute('open');
    await user.click(firstSummary!);
    expect(firstDetails).toHaveAttribute('open');
    expect(screen.getByText(/코딩이 처음인 사람도/)).toBeInTheDocument();
  });
});
