'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  refreshSession,
  listMembers,
  updateMember,
  resetMemberPassword,
  offboardMember,
  AdminApiError,
} from '@/lib/adminApi';
import MemberRegistrationPanel from '@/components/admin/MemberRegistrationPanel';
import { MEMBER_ROLE_OPTIONS, memberRoleLabel } from '@/lib/memberRegistration';
import type { MemberAdminSummary, MemberRole } from '@shared/types/member';

export default function MemberManagement() {
  const router = useRouter();

  const [members, setMembers] = useState<MemberAdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadIndex, setReloadIndex] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    roles: [] as MemberRole[],
  });

  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        await refreshSession();
        if (cancelled) return;
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
      const updated = await updateMember(id, {
        name: editForm.name.trim(),
        roles: editForm.roles,
      });
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
          className="min-h-11 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">멤버 관리</h1>
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="min-h-11 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
        >
          ← 대시보드
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">부원 목록</h2>
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent"
        >
          {createOpen ? '닫기' : '+ 부원 등록'}
        </button>
      </div>

      {createOpen && (
        <MemberRegistrationPanel
          existingMembers={members}
          onCreated={(created) => setMembers((previous) => [...previous, ...created])}
        />
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
              <li key={member.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-white/30 focus-visible:ring-2 focus-visible:ring-accent/60"
                    />
                    <div className="flex flex-wrap gap-2">
                      {MEMBER_ROLE_OPTIONS.map(({ value: role, label }) => (
                        <button
                          type="button"
                          key={role}
                          onClick={() => toggleEditRole(role)}
                          className={`min-h-11 rounded-full border px-3 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                            editForm.roles.includes(role)
                              ? 'border-white/40 bg-white/20 text-white'
                              : 'border-white/10 bg-white/5 text-muted hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy || editForm.roles.length === 0}
                        onClick={() => handleEditSubmit(member.id)}
                        className="min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-11 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
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
                      <p className="break-words text-sm text-muted">
                        {member.studentId} · {member.cohort}기 · {member.roles.map(memberRoleLabel).join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!member.offboarded && (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(member)}
                            className="min-h-11 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleResetPassword(member)}
                            className="min-h-11 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                          >
                            비밀번호 초기화
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleOffboard(member)}
                            className="min-h-11 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                          >
                            오프보딩
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const admissionYear = member.studentId?.slice(0, 4) ?? '';
                              const params = new URLSearchParams({
                                name: member.name,
                                department: member.department ?? '',
                                admissionYear,
                              });
                              router.push(`/admin/staff?${params.toString()}`);
                            }}
                            className="min-h-11 rounded-full border border-white/20 px-4 py-1.5 text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                          >
                            운영진으로 지정
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
