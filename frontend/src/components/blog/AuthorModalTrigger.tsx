'use client';

import type { ReactNode } from 'react';
import { useMemberModal } from '@/components/members/MemberModalProvider';

type Props = {
  memberId: number;
  name: string;
  children: ReactNode;
};

// 단독 저자 글의 작성자 블록(PostAuthor)을 감싸 눌러서 소개 모달을 열게 한다.
// PostAuthor는 div/p 같은 flow 콘텐츠라 <button> 안에 못 넣으므로 role="button" 패턴을 쓴다.
// 작성자가 공개 명단에 없으면(비공개·오프보딩) provider가 조용히 무시한다.
export default function AuthorModalTrigger({ memberId, name, children }: Props) {
  const { openMemberById } = useMemberModal();

  const open = (rect: DOMRect) => openMemberById(memberId, { originRect: rect, fallbackName: name });

  return (
    <div
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`${name}님 소개 보기`}
      onClick={(event) => open(event.currentTarget.getBoundingClientRect())}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(event.currentTarget.getBoundingClientRect());
        }
      }}
      className="inline-flex w-fit cursor-pointer rounded-2xl outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </div>
  );
}
