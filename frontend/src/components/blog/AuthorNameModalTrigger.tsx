'use client';

import { useMemberModal } from '@/components/members/MemberModalProvider';

type Props = {
  memberId: number;
  name: string;
};

// 공동저자 바이라인에서는 이미지나 바이라인 전체가 아니라 각 이름만 해당 멤버를 연다.
export default function AuthorNameModalTrigger({ memberId, name }: Props) {
  const { openMemberById } = useMemberModal();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${name}님 소개 보기`}
      onClick={(event) =>
        openMemberById(memberId, {
          originRect: event.currentTarget.getBoundingClientRect(),
          fallbackName: name,
        })
      }
      className="rounded-sm outline-none transition-colors hover:text-accent focus-visible:text-accent focus-visible:ring-2 focus-visible:ring-accent"
    >
      {name}
    </button>
  );
}
