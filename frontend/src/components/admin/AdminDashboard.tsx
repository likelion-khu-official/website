'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  refreshSession,
  logout,
  listAdmins,
  createInvitation,
  deleteAdmin,
  updateAdminRole,
  AdminApiError,
} from '@/lib/adminApi';
import type { AdminAccount, AdminRole, AdminSummary } from '@shared/types/admin';

const ROLE_LABEL: Record<AdminRole, string> = { SUPER_ADMIN: '최고관리자', ADMIN: '운영진' };
const STATUS_LABEL: Record<AdminSummary['status'], string> = { ACTIVE: '활성', LOCKED: '잠김' };

export default function AdminDashboard() {
  const router = useRouter();

  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [admins, setAdmins] = useState<AdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState('');

  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        // 별도 "me" 엔드포인트가 없어 refresh 응답으로 현재 세션 신원을 확인한다.
        const session = await refreshSession();
        if (cancelled) return;
        setCurrentAdmin(session.admin);
        const list = await listAdmins();
        if (cancelled) return;
        setAdmins(list);
      } catch (err) {
        if (cancelled) return;
        if (
          err instanceof AdminApiError &&
          (err.status === 401 || err.code === 'UNAUTHENTICATED' || err.code === 'INVALID_REFRESH_TOKEN')
        ) {
          router.replace('/admin/login');
          return;
        }
        setLoadError(err instanceof AdminApiError ? err.message : '불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadIndex, router]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // 로그아웃 요청이 실패해도 어차피 로그인 화면으로 보낸다
    }
    router.push('/admin/login');
    router.refresh();
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inviteSubmitting) return;
    setInviteSubmitting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const invitation = await createInvitation({ email: inviteEmail.trim() });
      setInviteSuccess(`${invitation.email}로 초대를 보냈어요.`);
      setInviteEmail('');
    } catch (err) {
      setInviteError(err instanceof AdminApiError ? err.message : '초대에 실패했어요.');
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleRoleChange(admin: AdminSummary, role: AdminRole) {
    if (role === admin.role) return;
    if (!window.confirm(`${admin.name}님의 역할을 ${ROLE_LABEL[role]}(으)로 변경할까요?`)) return;
    setBusyId(admin.id);
    setRowError('');
    try {
      await updateAdminRole(admin.id, { role });
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, role } : a)));
    } catch (err) {
      setRowError(err instanceof AdminApiError ? err.message : '역할 변경에 실패했어요.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(admin: AdminSummary) {
    if (!window.confirm(`${admin.name}님을 운영진에서 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusyId(admin.id);
    setRowError('');
    try {
      await deleteAdmin(admin.id);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (err) {
      setRowError(err instanceof AdminApiError ? err.message : '삭제에 실패했어요.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="py-24 text-center text-sm text-muted">불러오고 있어요…</p>;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-muted">{loadError}</p>
        <button
          type="button"
          onClick={() => setReloadIndex((v) => v + 1)}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">어드민 대시보드</h1>
          {currentAdmin && (
            <p className="mt-1 text-sm text-muted">
              {currentAdmin.name} ({currentAdmin.email}) · {ROLE_LABEL[currentAdmin.role]}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          로그아웃
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">운영진 목록</h2>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setInviteOpen((v) => !v)}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
          >
            {inviteOpen ? '닫기' : '+ 초대'}
          </button>
        )}
      </div>

      {isSuperAdmin && inviteOpen && (
        <form
          onSubmit={handleInviteSubmit}
          className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-white" htmlFor="invite-email">
              초대할 이메일
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <button
            type="submit"
            disabled={inviteSubmitting}
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            {inviteSubmitting ? '보내는 중…' : '초대 보내기'}
          </button>
        </form>
      )}
      {inviteError && <p className="mb-4 text-sm text-red-400">{inviteError}</p>}
      {inviteSuccess && <p className="mb-4 text-sm text-emerald-400">{inviteSuccess}</p>}
      {rowError && <p className="mb-4 text-sm text-red-400">{rowError}</p>}

      {admins.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">운영진이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {admins.map((admin) => {
            const isSelf = admin.id === currentAdmin?.id;
            const busy = busyId === admin.id;
            return (
              <li
                key={admin.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {admin.name}
                    {isSelf && <span className="ml-1 text-muted">(나)</span>}
                  </p>
                  <p className="text-sm text-muted">{admin.email}</p>
                  <p className="mt-1 text-xs text-muted">
                    {ROLE_LABEL[admin.role]} · {STATUS_LABEL[admin.status]}
                  </p>
                </div>

                {isSuperAdmin && !isSelf && (
                  <div className="flex items-center gap-2">
                    <select
                      value={admin.role}
                      disabled={busy}
                      onChange={(e) => handleRoleChange(admin, e.target.value as AdminRole)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30 disabled:opacity-40"
                    >
                      <option value="ADMIN">운영진</option>
                      <option value="SUPER_ADMIN">최고관리자</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(admin)}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-40"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={() => router.push('/admin/members')}
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/20"
        >
          멤버 관리로 이동
        </button>
      </div>
    </div>
  );
}
