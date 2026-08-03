import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProjectImageGallery from './ProjectImageGallery';

const images = [
  { url: 'https://example.com/cover.png', representative: true },
  { url: 'https://example.com/detail.png', representative: false },
];

describe('ProjectImageGallery', () => {
  it('등록된 이미지를 순서대로 모두 보여준다', () => {
    render(<ProjectImageGallery title="dot.tory" images={images} />);

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'dot.tory 프로젝트 이미지 1' })).toHaveAttribute(
      'loading',
      'eager',
    );
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 이미지' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 이미지' })).toBeEnabled();
  });

  it('다음 버튼으로 한 장씩 이동하고 한 장뿐이면 탐색 UI를 숨긴다', () => {
    const { rerender } = render(<ProjectImageGallery title="dot.tory" images={images} />);
    const viewport = screen.getByRole('region', { name: 'dot.tory 프로젝트 이미지' }).firstElementChild as HTMLDivElement;
    viewport.scrollTo = vi.fn();
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 720 });

    fireEvent.click(screen.getByRole('button', { name: '다음 이미지' }));
    expect(viewport.scrollTo).toHaveBeenCalledWith({ left: 720, behavior: 'smooth' });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    rerender(<ProjectImageGallery title="dot.tory" images={[images[0]]} />);
    expect(screen.queryByRole('button', { name: '다음 이미지' })).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });

  it('이미지를 누르면 크게보기 뷰어를 열고 이미지 사이를 이동한 뒤 닫는다', () => {
    render(<ProjectImageGallery title="dot.tory" images={images} />);
    const viewport = screen.getByRole('region', { name: 'dot.tory 프로젝트 이미지' })
      .firstElementChild as HTMLDivElement;
    viewport.setPointerCapture = vi.fn();
    const imageTrigger = screen.getByRole('button', { name: '1번째 이미지 크게 보기' });

    fireEvent.pointerDown(imageTrigger, {
      pointerType: 'mouse',
      pointerId: 1,
      button: 0,
      clientX: 300,
    });
    expect(viewport.setPointerCapture).not.toHaveBeenCalled();
    fireEvent.pointerUp(imageTrigger, { pointerType: 'mouse', pointerId: 1, clientX: 300 });
    fireEvent.click(imageTrigger);
    expect(screen.getByRole('dialog', { name: 'dot.tory 이미지 크게 보기' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'dot.tory 프로젝트 이미지 1 크게 보기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '크게보기 다음 이미지' }));
    expect(screen.getByRole('img', { name: 'dot.tory 프로젝트 이미지 2 크게 보기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '크게보기 닫기' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ESC 키로 크게보기를 닫는다', () => {
    render(<ProjectImageGallery title="dot.tory" images={images} />);

    fireEvent.click(screen.getByRole('button', { name: '1번째 이미지 크게 보기' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('데스크톱에서는 마우스로 잡아 끌어 이미지를 넘길 수 있다', () => {
    render(<ProjectImageGallery title="dot.tory" images={images} />);
    const viewport = screen.getByRole('region', { name: 'dot.tory 프로젝트 이미지' })
      .firstElementChild as HTMLDivElement;
    viewport.scrollTo = vi.fn();
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 720 });

    fireEvent.pointerDown(viewport, {
      pointerType: 'mouse',
      pointerId: 1,
      button: 0,
      clientX: 600,
    });
    fireEvent.pointerMove(viewport, { pointerType: 'mouse', pointerId: 1, clientX: 180 });
    expect(viewport.scrollLeft).toBe(420);

    fireEvent.pointerUp(viewport, { pointerType: 'mouse', pointerId: 1, clientX: 180 });
    expect(viewport.scrollTo).toHaveBeenCalledWith({ left: 720, behavior: 'smooth' });
  });

  it('이미지 로드 실패를 빈 영역 대신 명확한 문구로 알린다', () => {
    render(<ProjectImageGallery title="dot.tory" images={images} />);

    fireEvent.error(screen.getByRole('img', { name: 'dot.tory 프로젝트 이미지 1' }));
    expect(screen.getByText('이미지를 불러오지 못했어요.')).toBeInTheDocument();
  });
});
