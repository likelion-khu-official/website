'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  refreshSession,
  listMembers,
  createMember,
  updateMember,
  resetMemberPassword,
  offboardMember,
  AdminApiError,
} from '@/lib/adminApi';
import type { AdminAccount } from '@shared/types/admin';
import type { MemberAdminSummary, MemberRole } from '@shared/types/member';

const ROLE_OPTIONS: MemberRole[] = ['PM', 'FE', 'BE', 'DESIGN', 'INFRA'];

const emptyForm = { name: '', studentId: '', phone: '', cohort: '', roles: [] as MemberRole[] };

export default function MemberManagement() {
  const router = useRouter();

  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [members, setMembers] = useState<MemberAdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadIndex, setReloadIndex] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', roles: [] as MemberRole[] });

  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const session = await refreshSession();
        if (cancelled) return;
        setCurrentAdmin(session.admin);
        const list = await listMembers();
        if (cancelled) return;
        setMembers(list);
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

  function toggleCreateRole(role: MemberRole) {
    setCreateForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (createSubmitting) return;
    setCreateSubmitting(true);
    setCreateError('');
    try {
      const created = await createMember({
        name: createForm.name.trim(),
        studentId: createForm.studentId.trim(),
        phone: createForm.phone.trim(),
        cohort: Number(createForm.cohort),
        roles: createForm.roles,
      });
      setMembers((prev) => [...prev, created]);
      setCreateForm(emptyForm);
      setCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof AdminApiError ? err.message : '등록에 실패했어요.');
    } finally {
      setCreateSubmitting(false);
    }
  }

  function startEdit(member: MemberAdminSummary) {
    setEditingId(member.id);
    setEditForm({ name: member.name, roles: member.roles });
    setRowError('');
  }

  function toggleEditRole(role: MemberRole) {
    setEditForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  }

  async function handleEditSubmit(id: number) {
    setBusyId(id);
    setRowError('');
    try {
      const updated = await updateMember(id, { name: editForm.name.trim(), roles: editForm.roles });
      setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setEditingId(null);
    } catch (err) {
      setRowError(err instanceof AdminApiError ? err.message : '수정에 실패했어요.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(member: MemberAdminSummary) {
    if (!window.confirm(`${member.name}님의 비밀번호를 전화번호로 초기화할까요?`)) return;
    setBusyId(member.id);
    setRowError('');
    try {
      await resetMemberPassword(member.id);
    } catch (err) {
      setRowError(err instanceof AdminApiError ? err.message : '비밀번호 초기화에 실패했어요.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleOffboard(member: MemberAdminSummary) {
    if (!window.confirm(`${member.name}님을 오프보딩할까요? 로그인만 막히고 남긴 글·기록은 그대로 남아요.`)) return;
    setBusyId(member.id);
    setRowError('');
    try {
      await offboardMember(member.id);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, offboarded: true } : m)));
    } catch (err) {
      setRowError(err instanceof AdminApiError ? err.message : '오프보딩에 실패했어요.');
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
        <h1 className="text-2xl font-bold text-white">멤버 관리</h1>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
        >
          ← 대시보드
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">부원 목록</h2>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
          >
            {createOpen ? '닫기' : '+ 부원 등록'}
          </button>
        )}
      </div>

      {isSuperAdmin && createOpen && (
        <form
          onSubmit={handleCreateSubmit}
          className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="이름"
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
            <input
              value={createForm.studentId}
              onChange={(e) => setCreateForm((p) => ({ ...p, studentId: e.target.value }))}
              placeholder="학번(로그인 아이디)"
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
            <input
              value={createForm.phone}
              onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="전화번호(초기 비밀번호)"
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
            <input
              value={createForm.cohort}
              onChange={(e) => setCreateForm((p) => ({ ...p, cohort: e.target.value }))}
              placeholder="기수"
              type="number"
              required
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button
                type="button"
                key={role}
                onClick={() => toggleCreateRole(role)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  createForm.roles.includes(role)
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/10 bg-white/5 text-muted hover:text-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <button
            type="submit"
            disabled={createSubmitting || createForm.roles.length === 0}
            className="self-start rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            {createSubmitting ? '등록 중…' : '등록하기'}
          </button>
        </form>
      )}

      {rowError && <p className="mb-4 text-sm text-red-400">{rowError}</p>}

      {members.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">등록된 부원이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {members.map((member) => {
            const busy = busyId === member.id;
            const isEditing = editingId === member.id;
            return (
              <li
                key={member.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-white/30"
                    />
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((role) => (
                        <button
                          type="button"
                          key={role}
                          onClick={() => toggleEditRole(role)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            editForm.roles.includes(role)
                              ? 'border-white/40 bg-white/20 text-white'
                              : 'border-white/10 bg-white/5 text-muted hover:text-white'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleEditSubmit(member.id)}
                        className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-40"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/10"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {member.emoji} {member.name}
                        {member.offboarded && <span className="ml-2 text-xs text-red-400">오프보딩됨</span>}
                      </p>
                      <p className="text-sm text-muted">
                        {member.studentId} · {member.cohort}기 · {member.roles.join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isSuperAdmin && !member.offboarded && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startEdit(member)}
                          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40"
                        >
                          수정
                        </button>
                      )}
                      {!member.offboarded && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleResetPassword(member)}
                            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40"
                          >
                            비밀번호 초기화
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleOffboard(member)}
                            className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40"
                          >
                            오프보딩
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
