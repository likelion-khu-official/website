'use client';

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { Member } from '@shared/types/member';
import { getMembers } from '@/lib/rosterApi';
import { ROLE_LABELS, ROLE_ORDER } from '@/lib/roster';
import { getCaretCoordinates } from '@/lib/caretCoordinates';

const MAX_ITEMS = 6;

// 캐럿 바로 앞에서 진행 중인 @멘션 쿼리를 찾는다. 순수 함수라 단위 테스트로 규칙을 고정한다.
// 규칙: @는 문자열 시작·공백·여는 괄호 뒤에 와야 하고, 뒤엔 공백·개행·마크다운 링크 문자가 없어야 한다.
export function findMentionQuery(
  textBeforeCaret: string,
): { query: string; atIndex: number } | null {
  const match = textBeforeCaret.match(/(?:^|[\s(])@([^\s@()[\]]*)$/);
  if (!match) return null;
  const query = match[1];
  return { query, atIndex: textBeforeCaret.length - query.length - 1 };
}

function primaryRoleLabel(member: Member): string | null {
  if (member.roles.length === 0) return null;
  const top = [...member.roles].sort(
    (left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right),
  )[0];
  return ROLE_LABELS[top];
}

export function useMentionAutocomplete(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  setContent: Dispatch<SetStateAction<string>>,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const rangeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const loadedRef = useRef(false);

  const ensureMembers = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    // 공개 명단만 태그 대상 — 비공개·오프보딩은 애초에 안 뜬다.
    getMembers('')
      .then(setMembers)
      .catch(() => {
        loadedRef.current = false; // 다음 @에서 재시도
      });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // 공개 명단에서 쿼리로 거른 후보(최대 MAX_ITEMS).
  const q = query.trim().toLowerCase();
  const items = (q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members).slice(
    0,
    MAX_ITEMS,
  );

  // textarea 값·캐럿이 바뀔 때마다 호출 — 멘션 컨텍스트면 열고, 아니면 닫는다.
  const handleInput = useCallback(
    (element: HTMLTextAreaElement) => {
      const caret = element.selectionStart ?? element.value.length;
      const found = findMentionQuery(element.value.slice(0, caret));
      if (!found) {
        setOpen(false);
        return;
      }
      ensureMembers();
      rangeRef.current = { start: found.atIndex, end: caret };
      const coords = getCaretCoordinates(element, found.atIndex);
      const rect = element.getBoundingClientRect();
      setAnchor({
        top: rect.top + coords.top - element.scrollTop + coords.height,
        left: rect.left + coords.left,
      });
      setQuery(found.query);
      setActiveIndex(0);
      setOpen(true);
    },
    [ensureMembers],
  );

  const select = useCallback(
    (member: Member) => {
      const { start, end } = rangeRef.current;
      const insert = `[@${member.name}](mention:${member.id}) `;
      setContent((prev) => prev.slice(0, start) + insert + prev.slice(end));
      setOpen(false);
      const caret = start + insert.length;
      requestAnimationFrame(() => {
        const element = textareaRef.current;
        if (!element) return;
        element.focus();
        element.setSelectionRange(caret, caret);
      });
    },
    [setContent, textareaRef],
  );

  // 열려 있을 때 위/아래로 후보 이동, Enter·Tab으로 확정, Esc로 닫기. 처리했으면 기본동작을 막는다.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open || items.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % items.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + items.length) % items.length);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        select(items[activeIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    },
    [open, items, activeIndex, select],
  );

  const dropdown =
    open && anchor && items.length > 0 ? (
      <ul
        role="listbox"
        aria-label="부원 태그 자동완성"
        style={{ position: 'fixed', top: anchor.top, left: anchor.left, zIndex: 60 }}
        className="mt-1 max-h-64 w-64 overflow-y-auto rounded-xl border border-white/12 bg-[#161616] p-1 shadow-[0_16px_50px_rgba(0,0,0,0.55)]"
      >
        {items.map((member, index) => {
          const roleLabel = primaryRoleLabel(member);
          return (
            <li key={member.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                // onMouseDown + preventDefault: textarea 포커스(와 캐럿)를 유지한 채 삽입한다.
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(member);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  index === activeIndex ? 'bg-white/10' : 'hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-sm">
                  {member.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    member.emoji ?? '🦁'
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {member.name}
                  </span>
                  {roleLabel ? (
                    <span className="block truncate text-[11px] text-white/45">{roleLabel}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return { handleInput, handleKeyDown, close, dropdown };
}
