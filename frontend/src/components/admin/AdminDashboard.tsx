'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecruitmentStatus, AdminApiError } from '@/lib/adminApi';
import type { RecruitmentStatusResponse } from '@shared/types/recruitment';

interface QuickAction {
  href: string;
  title: string;
  description: string;
}

interface ActionGroup {
  eyebrow: string;
  title: string;
  description: string;
  actions: QuickAction[];
}

const ACTION_GROUPS: ActionGroup[] = [
  {
    eyebrow: 'PEOPLE',
    title: '사람과 계정',
    description: '새 부원을 맞이하고 사이트를 함께 운영할 사람을 관리해요.',
    actions: [
      {
        href: '/admin/members',
        title: '멤버 관리',
        description: '부원 등록 · 정보 수정 · 비밀번호 초기화',
      },
      {
        href: '/admin/admins',
        title: '관리자 계정',
        description: '관리자 초대 · 계정 상태 확인',
      },
    ],
  },
  {
    eyebrow: 'RECRUIT',
    title: '모집 운영',
    description: '모집을 열기 전 준비부터 접수된 지원서 확인까지 이어서 처리해요.',
    actions: [
      {
        href: '/admin/recruitment',
        title: '모집 관리',
        description: '모집 시작 · 종료 · 공개 화면 미리보기',
      },
      {
        href: '/admin/applications',
        title: '지원자 확인',
        description: '접수된 지원서 명단과 답변 열람',
      },
      {
        href: '/admin/application-form',
        title: '지원서 양식',
        description: '질문 구성과 안내 문구 편집',
      },
    ],
  },
  {
    eyebrow: 'CONTENT',
    title: '콘텐츠',
    description: '공식 사이트에 공개된 콘텐츠를 살피고 필요한 조치를 해요.',
    actions: [
      {
        href: '/admin/blog',
        title: '블로그 관리',
        description: '게시된 글 숨김 · 다시 게시',
      },
    ],
  },
];

function isUnauthenticated(error: unknown) {
  return (
    error instanceof AdminApiError &&
    (error.status === 401 ||
      error.code === 'UNAUTHENTICATED' ||
      error.code === 'INVALID_REFRESH_TOKEN')
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const [recruitmentStatus, setRecruitmentStatus] =
    useState<RecruitmentStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  const loadRecruitmentStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const status = await getRecruitmentStatus();
      setRecruitmentStatus(status);
    } catch (error) {
      if (isUnauthenticated(error)) {
        router.replace('/admin/login');
        return;
      }
      setRecruitmentStatus(null);
      setStatusError(
        error instanceof AdminApiError
          ? error.message
          : '모집 상태를 불러오지 못했어요.'
      );
    } finally {
      setStatusLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    getRecruitmentStatus()
      .then((status) => {
        if (!cancelled) setRecruitmentStatus(status);
      })
      .catch((error) => {
        if (cancelled) return;
        if (isUnauthenticated(error)) {
          router.replace('/admin/login');
          return;
        }
        setRecruitmentStatus(null);
        setStatusError(
          error instanceof AdminApiError
            ? error.message
            : '모집 상태를 불러오지 못했어요.'
        );
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="border-b border-white/10 pb-7">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent">
            ADMIN WORKSPACE
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            오늘의 운영을 시작해볼까요?
          </h1>
          <p className="mt-2 text-sm text-muted">
            현재 상태를 확인하고 필요한 관리 업무로 바로 이동하세요.
          </p>
        </div>
      </header>

      <section
        className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
        aria-labelledby="recruitment-status-title"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div className="p-5 sm:p-7">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted">
              RECRUITMENT STATUS
            </p>
            <h2
              id="recruitment-status-title"
              className="mt-2 text-lg font-semibold text-white"
            >
              현재 모집 상태
            </h2>

            {statusLoading ? (
              <p className="mt-5 text-sm text-muted" aria-live="polite">
                모집 상태를 확인하고 있어요…
              </p>
            ) : statusError ? (
              <div className="mt-5" role="status">
                <p className="text-sm font-medium text-white">
                  지금은 상태를 확인할 수 없어요.
                </p>
                <p className="mt-1 text-sm text-muted">{statusError}</p>
                <button
                  type="button"
                  onClick={loadRecruitmentStatus}
                  className="mt-4 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  상태 다시 불러오기
                </button>
              </div>
            ) : recruitmentStatus ? (
              <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
                <p
                  className={`text-3xl font-bold ${
                    recruitmentStatus.open
                      ? 'text-emerald-300'
                      : 'text-white'
                  }`}
                >
                  {recruitmentStatus.open ? '모집중' : '평소'}
                </p>
                <p className="pb-0.5 text-sm text-muted">
                  모집 알림 구독자{' '}
                  <strong className="font-semibold text-white">
                    {recruitmentStatus.subscriberCount}명
                  </strong>
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-between gap-5 border-t border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:border-t-0 lg:border-l">
            <p className="text-sm leading-6 text-muted">
              {recruitmentStatus?.open
                ? '지원자가 보는 모집 화면을 확인하고, 접수 현황을 이어서 살펴보세요.'
                : recruitmentStatus?.subscriberCount === 0
                  ? '아직 안내를 기다리는 구독자가 없어요. 모집 화면을 미리 준비할 수 있어요.'
                  : '모집을 시작하면 기다리고 있는 구독자에게 안내 메일이 한 번 발송돼요.'}
            </p>
            <Link
              href="/admin/recruitment"
              className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-accent"
            >
              모집 관리 열기
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="quick-actions-title">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted">
            QUICK ACTIONS
          </p>
          <h2
            id="quick-actions-title"
            className="mt-2 text-xl font-semibold text-white"
          >
            어떤 일을 하러 오셨나요?
          </h2>
          <p className="mt-2 text-sm text-muted">
            목적을 고르면 필요한 관리 화면으로 바로 이동해요.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ACTION_GROUPS.map((group) => (
            <article
              key={group.eyebrow}
              className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
            >
              <p className="text-xs font-semibold tracking-[0.16em] text-accent">
                {group.eyebrow}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {group.title}
              </h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted">
                {group.description}
              </p>

              <ul className="mt-5 flex flex-1 flex-col gap-2">
                {group.actions.map((action) => (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="group flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">
                          {action.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {action.description}
                        </span>
                      </span>
                      <span
                        className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
