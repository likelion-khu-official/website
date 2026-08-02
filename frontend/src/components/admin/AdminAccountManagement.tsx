'use client';

import { useEffect, useState } from 'react';
import { SkeletonRows } from './AdminLoading';
import { useRouter } from 'next/navigation';
import {
  AdminApiError,
  cancelInvitation,
  createInvitation,
  deleteAdmin,
  listAdmins,
  listInvitations,
  refreshSession,
} from '@/lib/adminApi';
import type {
  AdminAccount,
  AdminInvitationSummary,
  AdminSummary,
  InvitationStatus,
} from '@shared/types/admin';

const ADMIN_STATUS_LABEL: Record<AdminSummary['status'], string> = {
  ACTIVE: '활성',
  LOCKED: '잠김',
};

const INVITATION_STATUS_LABEL: Record<InvitationStatus, string> = {
  PENDING: '대기 중',
  ACCEPTED: '수락됨',
  CANCELLED: '취소됨',
  EXPIRED: '만료됨',
};

function isUnauthenticated(error: unknown) {
  return (
    error instanceof AdminApiError &&
    (error.status === 401 ||
      error.code === 'UNAUTHENTICATED' ||
      error.code === 'INVALID_REFRESH_TOKEN')
  );
}

function formatExpiresAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AdminAccountManagement() {
  const router = useRouter();

  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [admins, setAdmins] = useState<AdminSummary[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsError, setAdminsError] = useState('');
  const [adminsReloadIndex, setAdminsReloadIndex] = useState(0);

  const [invitations, setInvitations] = useState<AdminInvitationSummary[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState('');
  const [invitationsReloadIndex, setInvitationsReloadIndex] = useState(0);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [deletingAdminId, setDeletingAdminId] = useState<number | null>(null);
  const [adminRowError, setAdminRowError] = useState<{ id: number; message: string } | null>(
    null
  );
  const [cancellingInvitationId, setCancellingInvitationId] = useState<number | null>(null);
  const [invitationRowError, setInvitationRowError] = useState<{
    id: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await refreshSession();
        if (!cancelled) setCurrentAdmin(session.admin);
      } catch (error) {
        if (cancelled) return;
        if (isUnauthenticated(error)) {
          router.replace('/admin/login');
          return;
        }
        router.replace('/admin');
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!currentAdmin) return;
    let cancelled = false;

    (async () => {
      setAdminsLoading(true);
      setAdminsError('');
      try {
        const list = await listAdmins();
        if (!cancelled) setAdmins(list);
      } catch (error) {
        if (cancelled) return;
        if (isUnauthenticated(error)) {
          router.replace('/admin/login');
          return;
        }
        setAdminsError(
          error instanceof AdminApiError ? error.message : '관리자 목록을 불러오지 못했어요.'
        );
      } finally {
        if (!cancelled) setAdminsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminsReloadIndex, currentAdmin, router]);

  useEffect(() => {
    if (!currentAdmin) return;
    let cancelled = false;

    (async () => {
      setInvitationsLoading(true);
      setInvitationsError('');
      try {
        const list = await listInvitations();
        if (!cancelled) setInvitations(list);
      } catch (error) {
        if (cancelled) return;
        if (isUnauthenticated(error)) {
          router.replace('/admin/login');
          return;
        }
        setInvitationsError(
          error instanceof AdminApiError ? error.message : '초대 목록을 불러오지 못했어요.'
        );
      } finally {
        if (!cancelled) setInvitationsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentAdmin, invitationsReloadIndex, router]);

  async function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviteSubmitting) return;

    setInviteSubmitting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const invitation = await createInvitation({ email: inviteEmail.trim() });
      setInvitations((current) => [
        invitation,
        ...current
          .filter((item) => item.id !== invitation.id)
          .map((item) =>
            item.status === 'PENDING' &&
            item.email.toLocaleLowerCase() === invitation.email.toLocaleLowerCase()
              ? { ...item, status: 'CANCELLED' as const }
              : item
          ),
      ]);
      setInviteEmail('');
      setInviteSuccess(`${invitation.email}로 초대를 보냈어요.`);
    } catch (error) {
      setInviteError(error instanceof AdminApiError ? error.message : '초대에 실패했어요.');
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleDeleteAdmin(admin: AdminSummary) {
    if (
      !window.confirm(
        `${admin.name}님의 관리자 계정을 삭제할까요? 삭제하면 더 이상 어드민에 로그인할 수 없어요.`
      )
    ) {
      return;
    }

    setDeletingAdminId(admin.id);
    setAdminRowError(null);
    try {
      await deleteAdmin(admin.id);
      setAdmins((current) => current.filter((item) => item.id !== admin.id));
    } catch (error) {
      const message =
        error instanceof AdminApiError && error.code === 'LAST_ADMIN'
          ? '마지막 관리자는 삭제할 수 없어요. 새 관리자를 먼저 초대하고 로그인을 확인한 뒤 다시 시도해 주세요.'
          : error instanceof AdminApiError
            ? error.message
            : '관리자 삭제에 실패했어요.';
      setAdminRowError({ id: admin.id, message });
    } finally {
      setDeletingAdminId(null);
    }
  }

  async function handleCancelInvitation(invitation: AdminInvitationSummary) {
    if (!window.confirm(`${invitation.email}로 보낸 초대를 취소할까요?`)) return;

    setCancellingInvitationId(invitation.id);
    setInvitationRowError(null);
    try {
      await cancelInvitation(invitation.id);
      setInvitations((current) =>
        current.map((item) =>
          item.id === invitation.id ? { ...item, status: 'CANCELLED' } : item
        )
      );
    } catch (error) {
      setInvitationRowError({
        id: invitation.id,
        message:
          error instanceof AdminApiError ? error.message : '초대 취소에 실패했어요.',
      });
    } finally {
      setCancellingInvitationId(null);
    }
  }

  if (sessionLoading || !currentAdmin) {
    return <p className="py-24 text-center text-sm text-muted">계정을 확인하고 있어요…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-8">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            Admin accounts
          </p>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">관리자 계정</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            다음 운영진을 초대하고, 더 이상 운영하지 않는 관리자 계정을 정리해요.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <section
          aria-labelledby="admin-list-title"
          className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 id="admin-list-title" className="text-lg font-semibold text-white">
                현재 관리자
              </h2>
              <p className="mt-1 text-sm text-muted">관리자는 모두 같은 운영 권한을 가져요.</p>
            </div>
            {!adminsLoading && !adminsError && (
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs text-muted">
                {admins.length}명
              </span>
            )}
          </div>

          {adminsLoading ? (
            <SkeletonRows count={3} rowClassName="h-16 w-full rounded-xl" />
          ) : adminsError ? (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4">
              <p className="text-sm text-red-300">{adminsError}</p>
              <button
                type="button"
                onClick={() => setAdminsReloadIndex((value) => value + 1)}
                className="mt-3 min-h-11 rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 outline-none hover:bg-red-300/10 focus-visible:ring-2 focus-visible:ring-red-300"
              >
                관리자 목록 다시 시도
              </button>
            </div>
          ) : admins.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">등록된 관리자가 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {admins.map((admin) => {
                const isSelf = admin.id === currentAdmin.id;
                const deleting = deletingAdminId === admin.id;
                const rowError = adminRowError?.id === admin.id ? adminRowError.message : '';

                return (
                  <li
                    key={admin.id}
                    className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{admin.name}</p>
                          {isSelf && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                              나
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              admin.status === 'ACTIVE'
                                ? 'bg-emerald-400/10 text-emerald-300'
                                : 'bg-amber-400/10 text-amber-300'
                            }`}
                          >
                            {ADMIN_STATUS_LABEL[admin.status]}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-sm leading-5 text-muted">{admin.email}</p>
                      </div>

                      {!isSelf && (
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => handleDeleteAdmin(admin)}
                          className="min-h-11 w-full shrink-0 rounded-full border border-red-300/25 px-4 py-2 text-sm text-red-200 outline-none transition-colors hover:bg-red-300/10 focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {deleting ? '삭제 중…' : '계정 삭제'}
                        </button>
                      )}
                    </div>
                    {rowError && (
                      <p role="alert" className="mt-3 text-sm leading-5 text-red-300">
                        {rowError}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-labelledby="admin-invite-title"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6"
          >
            <h2 id="admin-invite-title" className="text-lg font-semibold text-white">
              새 관리자 초대
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              경희대학교 이메일로 초대 링크를 보내요. 링크는 72시간 동안 유효해요.
            </p>

            <form onSubmit={handleInviteSubmit} className="mt-5">
              <label htmlFor="admin-invite-email" className="mb-2 block text-sm font-medium text-white">
                학교 이메일
              </label>
              <input
                id="admin-invite-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@khu.ac.kr"
                required
                pattern=".+@khu\.ac\.kr"
                disabled={inviteSubmitting}
                className="min-h-11 w-full rounded-xl border border-white/15 bg-black/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-muted/60 focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={inviteSubmitting}
                className="mt-3 min-h-11 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {inviteSubmitting ? '초대 보내는 중…' : '초대 보내기'}
              </button>
            </form>

            {inviteError && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p role="status" className="mt-3 text-sm text-emerald-300">
                {inviteSuccess}
              </p>
            )}
          </section>

          <section
            aria-labelledby="invitation-list-title"
            className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 id="invitation-list-title" className="text-lg font-semibold text-white">
                  초대 내역
                </h2>
                <p className="mt-1 text-sm text-muted">대기 중인 초대는 수락 전에 취소할 수 있어요.</p>
              </div>
              {!invitationsLoading && !invitationsError && (
                <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs text-muted">
                  {invitations.length}건
                </span>
              )}
            </div>

            {invitationsLoading ? (
              <SkeletonRows count={2} rowClassName="h-16 w-full rounded-xl" />
            ) : invitationsError ? (
              <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4">
                <p className="text-sm text-red-300">{invitationsError}</p>
                <button
                  type="button"
                  onClick={() => setInvitationsReloadIndex((value) => value + 1)}
                  className="mt-3 min-h-11 rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-100 outline-none hover:bg-red-300/10 focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  초대 내역 다시 시도
                </button>
              </div>
            ) : invitations.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">아직 보낸 초대가 없어요.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {invitations.map((invitation) => {
                  const cancelling = cancellingInvitationId === invitation.id;
                  const rowError =
                    invitationRowError?.id === invitation.id
                      ? invitationRowError.message
                      : '';

                  return (
                    <li
                      key={invitation.id}
                      className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-all text-sm font-medium leading-5 text-white">
                              {invitation.email}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                invitation.status === 'PENDING'
                                  ? 'bg-blue-400/10 text-blue-300'
                                  : 'bg-white/10 text-muted'
                              }`}
                            >
                              {INVITATION_STATUS_LABEL[invitation.status]}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted">
                            만료 {formatExpiresAt(invitation.expiresAt)}
                          </p>
                          <p className="break-all text-xs leading-5 text-muted">
                            초대한 관리자 {invitation.invitedBy}
                          </p>
                        </div>

                        {invitation.status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={() => handleCancelInvitation(invitation)}
                            className="min-h-11 w-full shrink-0 rounded-full border border-white/20 px-4 py-2 text-sm text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {cancelling ? '취소 중…' : '초대 취소'}
                          </button>
                        )}
                      </div>
                      {rowError && (
                        <p role="alert" className="mt-3 text-sm text-red-300">
                          {rowError}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
