'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Skeleton from '@/components/Skeleton';
import {
  AdminApiError,
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
} from '@/lib/adminApi';
import StaffImageCropper from '@/components/admin/StaffImageCropper';
import StaffShowcaseCard from '@/components/staff/StaffShowcaseCard';
import { selectPublishedStaff } from '@/lib/staffLanding';
import type { StaffAdminSummary, StaffCreateRequest, StaffUpdateRequest } from '@shared/types/staff';

type PreviewMode = 'desktop' | 'mobile';

interface DraftStaff extends StaffAdminSummary {
  clientId: string;
  persistedId: number | null;
}

interface EditorForm {
  clientId: string;
  persistedId: number | null;
  name: string;
  position: string;
  department: string;
  admissionYear: string;
  photoUrl: string;
  publicationConsent: boolean;
  publicationConsentedAt: string | null;
}

const INPUT_CLASS =
  'min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/50';

function toDraft(person: StaffAdminSummary): DraftStaff {
  return {
    ...person,
    clientId: `staff-${person.id}`,
    persistedId: person.id,
  };
}

function sortAndNumber(items: DraftStaff[]) {
  return [...items]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
    .map((person, index) => ({ ...person, sortOrder: index + 1 }));
}

function editorOf(person: DraftStaff): EditorForm {
  return {
    clientId: person.clientId,
    persistedId: person.persistedId,
    name: person.name,
    position: person.position,
    department: person.department,
    admissionYear: String(person.admissionYear),
    photoUrl: person.photoUrl,
    publicationConsent: person.publicationConsent,
    publicationConsentedAt: person.publicationConsentedAt,
  };
}

function snapshot(items: DraftStaff[]) {
  return JSON.stringify(
    items.map((person) => {
      const comparable: Record<string, unknown> = { ...person };
      delete comparable.clientId;
      delete comparable.persistedId;
      return comparable;
    })
  );
}

export default function StaffManagement() {
  const nextTemporaryId = useRef(-1);
  const draggingIdRef = useRef<string | null>(null);

  const [staff, setStaff] = useState<DraftStaff[]>([]);
  const [savedStaff, setSavedStaff] = useState<DraftStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadIndex, setReloadIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');

  const [editor, setEditor] = useState<EditorForm | null>(null);
  const [editorError, setEditorError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listStaff()
      .then((items) => {
        if (cancelled) return;
        const next = sortAndNumber(items.map(toDraft));
        setStaff(next);
        setSavedStaff(next);
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof AdminApiError ? caught.message : '운영진 목록을 불러오지 못했어요.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadIndex]);

  useEffect(() => {
    if (!draggingId) return;

    function handlePointerMove(event: PointerEvent) {
      const sourceId = draggingIdRef.current;
      if (!sourceId) return;
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-staff-drag-id]');
      const targetId = target?.dataset.staffDragId;
      if (!targetId || targetId === sourceId) return;

      setStaff((current) => {
        const sourceIndex = current.findIndex((person) => person.clientId === sourceId);
        const targetIndex = current.findIndex((person) => person.clientId === targetId);
        if (sourceIndex < 0 || targetIndex < 0) return current;
        const next = [...current];
        const [moved] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next.map((person, index) => ({ ...person, sortOrder: index + 1 }));
      });
    }

    function finishDragging() {
      draggingIdRef.current = null;
      setDraggingId(null);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDragging, { once: true });
    window.addEventListener('pointercancel', finishDragging, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDragging);
      window.removeEventListener('pointercancel', finishDragging);
    };
  }, [draggingId]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 3000);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const dirty = useMemo(() => snapshot(staff) !== snapshot(savedStaff), [savedStaff, staff]);
  const landingStaff = useMemo(() => selectPublishedStaff(staff), [staff]);
  const privateStaff = useMemo(
    () => staff.filter((person) => !person.publicationConsent),
    [staff]
  );

  function openCreate() {
    const temporaryId = nextTemporaryId.current--;
    setEditor({
      clientId: `new-${Math.abs(temporaryId)}`,
      persistedId: null,
      name: '',
      position: '',
      department: '',
      admissionYear: '',
      photoUrl: '',
      publicationConsent: false,
      publicationConsentedAt: null,
    });
    setEditorError('');
  }

  function openEdit(person: DraftStaff) {
    if (draggingIdRef.current) return;
    setEditor(editorOf(person));
    setEditorError('');
  }

  function applyEditor() {
    if (!editor) return;
    const name = editor.name.trim();
    const position = editor.position.trim();
    const department = editor.department.trim();
    const admissionYear = Number(editor.admissionYear);

    if (!name || !position || !department || !editor.admissionYear) {
      setEditorError('이름·직책·학과·학번 연도를 모두 입력해 주세요.');
      return;
    }
    if (!Number.isInteger(admissionYear)) {
      setEditorError('학번 연도는 정수로 입력해 주세요.');
      return;
    }
    if (!editor.photoUrl) {
      setEditorError('사진을 선택하고 원 안에 맞춰 주세요.');
      return;
    }

    setStaff((current) => {
      const existing = current.find((person) => person.clientId === editor.clientId);
      const nextPerson: DraftStaff = {
        id: existing?.id ?? nextTemporaryId.current--,
        clientId: editor.clientId,
        persistedId: editor.persistedId,
        name,
        position,
        department,
        admissionYear,
        photoUrl: editor.photoUrl,
        introduction: existing?.introduction ?? null,
        activities: existing?.activities ?? [],
        sortOrder: existing?.sortOrder ?? current.length + 1,
        studentId: existing?.studentId ?? null,
        publicationConsent: editor.publicationConsent,
        publicationConsentedAt: editor.publicationConsent
          ? editor.publicationConsentedAt ?? new Date().toISOString()
          : null,
      };
      return existing
        ? current.map((person) => (person.clientId === editor.clientId ? nextPerson : person))
        : [...current, nextPerson];
    });
    setEditor(null);
    setEditorError('');
  }

  function removeFromDraft(person: DraftStaff) {
    if (!window.confirm(`${person.name} 카드를 목록에서 뺄까요? 하단의 저장을 눌러야 실제로 삭제돼요.`)) return;
    setStaff((current) =>
      current
        .filter((item) => item.clientId !== person.clientId)
        .map((item, index) => ({ ...item, sortOrder: index + 1 }))
    );
    setEditor(null);
  }

  async function saveChanges() {
    if (!dirty || saving) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const currentPersistedIds = new Set(
        staff.flatMap((person) => (person.persistedId === null ? [] : [person.persistedId]))
      );
      const deletedIds = savedStaff.flatMap((person) =>
        person.persistedId !== null && !currentPersistedIds.has(person.persistedId) ? [person.persistedId] : []
      );

      await Promise.all(deletedIds.map((id) => deleteStaff(id)));
      await Promise.all(
        staff.map((person) => {
          const publicationConsentedAt = person.publicationConsent
            ? person.publicationConsentedAt ?? new Date().toISOString()
            : undefined;

          if (person.persistedId === null) {
            const body: StaffCreateRequest = {
              name: person.name,
              position: person.position,
              department: person.department,
              admissionYear: person.admissionYear,
              photoUrl: person.photoUrl,
              activities: [],
              sortOrder: person.sortOrder,
              publicationConsent: person.publicationConsent,
              publicationConsentedAt,
            };
            return createStaff(body);
          }

          const body: StaffUpdateRequest = {
            name: person.name,
            position: person.position,
            department: person.department,
            admissionYear: person.admissionYear,
            photoUrl: person.photoUrl,
            sortOrder: person.sortOrder,
            publicationConsent: person.publicationConsent,
            publicationConsentedAt,
          };
          return updateStaff(person.persistedId, body);
        })
      );

      const refreshed = sortAndNumber((await listStaff()).map(toDraft));
      setStaff(refreshed);
      setSavedStaff(refreshed);
      setSaveSuccess(true);
    } catch (caught) {
      setSaveError(caught instanceof AdminApiError ? caught.message : '변경사항을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  }

  function discardChanges() {
    if (!window.confirm('저장하지 않은 변경사항을 모두 되돌릴까요?')) return;
    setStaff(savedStaff.map((person) => ({ ...person })));
    setEditor(null);
    setSaveError('');
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl pb-6" role="status" aria-label="불러오는 중">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-8 w-40" tone="strong" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <Skeleton className="h-[440px] w-full rounded-[22px]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-muted">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setLoadError('');
            setReloadIndex((value) => value + 1);
          }}
          className="min-h-11 rounded-full border border-white/20 bg-white/10 px-5 text-sm text-white"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full max-w-7xl ${dirty ? 'pb-28' : 'pb-6'}`}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Landing preview</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">운영진 소개 편집</h1>
          <p className="mt-2 text-sm leading-6 text-white/45">
            공개된 카드는 아래 모습과 순서 그대로 랜딩에 노출돼요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1">
            {(['desktop', 'mobile'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={previewMode === mode}
                onClick={() => setPreviewMode(mode)}
                className={`min-h-10 rounded-full px-4 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  previewMode === mode ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                }`}
              >
                {mode === 'desktop' ? '데스크톱' : '모바일'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white outline-none hover:bg-accent/85 focus-visible:ring-2 focus-visible:ring-white"
          >
            + 운영진 추가
          </button>
        </div>
      </header>

      <div className="rounded-[28px] border border-white/10 bg-[#110b09] p-3 sm:p-5">
        <section
          className={`members-bg relative mx-auto overflow-hidden rounded-[22px] border border-white/[0.06] px-5 py-10 transition-[width] duration-300 ${
            previewMode === 'mobile' ? 'w-[390px] max-w-full' : 'w-full min-w-0 px-5 lg:px-8'
          }`}
        >
          <div className="members-glow-base" />
          <div className="members-glow-accent" />

          <div className="relative z-[1] mx-auto w-full max-w-[1390px]">
            {landingStaff.length === 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-8 flex min-h-52 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/20 text-center outline-none hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-sm font-medium text-white">공개할 운영진 카드가 없어요.</span>
                <span className="mt-2 text-xs text-white/40">카드를 추가하거나 공개 설정을 켜 주세요.</span>
              </button>
            ) : (
              <div
                className={`grid gap-y-3 ${
                  previewMode === 'desktop' ? 'grid-cols-7 gap-x-1 lg:gap-x-3' : 'grid-cols-2 gap-x-4'
                }`}
              >
                {landingStaff.map((person) => (
                  <div
                    key={person.clientId}
                    data-staff-drag-id={person.clientId}
                    className={`group/card relative min-w-0 rounded-2xl border transition-colors ${
                      draggingId === person.clientId
                        ? 'border-accent bg-accent/10 opacity-80'
                        : 'border-transparent hover:border-white/15 hover:bg-white/[0.035]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(person)}
                      className="block w-full rounded-2xl pt-3 outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label={`${person.name} 운영진 카드 수정`}
                    >
                      <StaffShowcaseCard staff={person} mode={previewMode} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${person.name} 순서 옮기기`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        draggingIdRef.current = person.clientId;
                        setDraggingId(person.clientId);
                      }}
                      className="absolute right-1.5 top-1.5 flex h-10 w-10 touch-none items-center justify-center rounded-full border border-white/15 bg-black/70 text-base text-white/65 opacity-100 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent lg:opacity-0 lg:group-hover/card:opacity-100 lg:focus:opacity-100"
                    >
                      ⠿
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <p className="mt-3 text-center text-xs text-white/35">
        {previewMode === 'desktop'
          ? '공개 설정된 모든 카드를 데스크톱 랜딩 순서 그대로 보여줘요.'
          : '390px 모바일 화면의 2열 배치예요.'}
      </p>

      {privateStaff.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">비공개 카드</h2>
            <p className="mt-1 text-xs leading-5 text-white/40">
              랜딩에는 보이지 않지만, 카드를 눌러 수정하거나 공개로 전환할 수 있어요.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {privateStaff.map((person) => (
              <button
                key={person.clientId}
                type="button"
                onClick={() => openEdit(person)}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left outline-none hover:border-white/20 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-accent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={person.photoUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover opacity-60"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white/70">{person.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-white/35">{person.position}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {editor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-editor-title"
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="my-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-[#171717] p-4 shadow-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  {editor.persistedId === null ? 'New card' : 'Edit card'}
                </p>
                <h2 id="staff-editor-title" className="mt-1 text-xl font-semibold text-white">
                  {editor.persistedId === null ? '운영진 추가' : `${editor.name} 카드 수정`}
                </h2>
              </div>
              <button
                type="button"
                disabled={imageUploading}
                onClick={() => setEditor(null)}
                className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-white/65 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
              >
                닫기
              </button>
            </div>

            <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid content-start gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-white/75">이름 *</span>
                  <input
                    value={editor.name}
                    onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                    placeholder="김멋사"
                    className={INPUT_CLASS}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-white/75">직책 *</span>
                  <input
                    value={editor.position}
                    onChange={(event) => setEditor({ ...editor, position: event.target.value })}
                    placeholder="회장, 프론트엔드 세션장…"
                    className={INPUT_CLASS}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-white/75">학과 *</span>
                  <input
                    value={editor.department}
                    onChange={(event) => setEditor({ ...editor, department: event.target.value })}
                    placeholder="컴퓨터공학과"
                    className={INPUT_CLASS}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium text-white/75">학번 연도 *</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editor.admissionYear}
                    onChange={(event) => setEditor({ ...editor, admissionYear: event.target.value })}
                    placeholder="22"
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={editor.publicationConsent}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        publicationConsent: event.target.checked,
                        publicationConsentedAt: event.target.checked
                          ? editor.publicationConsentedAt ?? new Date().toISOString()
                          : null,
                      })
                    }
                    className="h-4 w-4 accent-[#ff7710]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">랜딩에 공개</span>
                    <span className="block text-xs text-white/35">본인의 사진·정보 게시 동의를 확인했어요.</span>
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-4 text-sm font-medium text-white/75">프로필 사진 *</p>
                <StaffImageCropper
                  value={editor.photoUrl}
                  onChange={(photoUrl) => setEditor((current) => (current ? { ...current, photoUrl } : current))}
                  onUploadingChange={setImageUploading}
                />
              </div>
            </div>

            {editorError ? <p role="alert" className="mt-5 text-sm text-red-400">{editorError}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <div>
                {editor.persistedId !== null ? (
                  <button
                    type="button"
                    disabled={imageUploading}
                    onClick={() => {
                      const person = staff.find((item) => item.clientId === editor.clientId);
                      if (person) removeFromDraft(person);
                    }}
                    className="min-h-11 rounded-full border border-red-400/20 px-4 text-sm text-red-300 outline-none hover:bg-red-400/10 focus-visible:ring-2 focus-visible:ring-red-300"
                  >
                    카드 삭제
                  </button>
                ) : null}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={imageUploading}
                  onClick={() => setEditor(null)}
                  className="min-h-11 rounded-full border border-white/15 px-5 text-sm text-white/65 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={imageUploading}
                  onClick={applyEditor}
                  className="min-h-11 rounded-full bg-white px-6 text-sm font-semibold text-black outline-none hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                >
                  {imageUploading ? '사진 처리 중…' : '미리보기에 적용'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {dirty ? (
        <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-[#21140f]/95 p-3 pl-5 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl sm:rounded-full">
          <div>
            <p className="text-sm font-semibold text-white">저장하지 않은 변경사항이 있어요.</p>
            <p className="mt-0.5 text-xs text-white/40">저장을 눌러야 실제 랜딩에 반영됩니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={discardChanges}
              className="min-h-11 rounded-full px-4 text-xs font-medium text-white/55 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
            >
              되돌리기
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={saveChanges}
              className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-white outline-none hover:bg-accent/85 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-50"
            >
              {saving ? '저장 중…' : '변경사항 저장'}
            </button>
          </div>
          {saveError ? <p className="w-full px-1 text-xs text-red-300 sm:text-right">{saveError}</p> : null}
        </div>
      ) : null}

      {saveSuccess ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-emerald-300/25 bg-emerald-950/95 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-[0_18px_50px_rgba(0,0,0,.45)] backdrop-blur-xl"
        >
          변경사항을 저장했어요.
        </div>
      ) : null}
    </div>
  );
}
