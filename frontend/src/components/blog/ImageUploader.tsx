'use client';

import { useEffect, useRef, useState } from 'react';
import { MemberApiError, uploadMemberImage } from '@/lib/memberApi';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export default function ImageUploader({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [state, setState] = useState<UploadState>(value ? 'done' : 'idle');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'jpg·png·webp·gif 형식만 업로드할 수 있어요.';
    }
    if (file.size > MAX_SIZE) {
      return '5MB 이하 파일만 업로드할 수 있어요.';
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      setState('error');
      return;
    }

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const localPreview = URL.createObjectURL(file);
    blobUrlRef.current = localPreview;

    setError('');
    setState('uploading');
    setLocalPreviewUrl(localPreview);
    onUploadingChange?.(true);

    try {
      const { url } = await uploadMemberImage(file);
      setState('done');
      onChange(url);
      setLocalPreviewUrl(null);
    } catch (err) {
      setState('error');
      setError(err instanceof MemberApiError ? err.message : '이미지 업로드에 실패했어요.');
      onChange(null);
      setLocalPreviewUrl(null);
    } finally {
      onUploadingChange?.(false);
    }
  }

  function handleRemove() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
    setState('idle');
    setError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-white">썸네일 이미지 (선택)</p>

      {localPreviewUrl ?? value ? (
        <div className="relative w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={localPreviewUrl ?? value ?? ''}
            alt="업로드한 썸네일 미리보기"
            className="aspect-[16/9] w-full rounded-xl object-cover"
          />
          {state === 'uploading' ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/55 text-sm font-medium text-white">
              업로드 중…
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 min-h-11 rounded-full bg-black/60 px-3 py-1 text-xs text-white outline-none hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-accent"
          >
            삭제
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex min-h-36 w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 text-center text-xs text-muted outline-none transition-colors focus-within:ring-2 focus-within:ring-accent ${
            dragOver ? 'border-accent bg-accent/5' : 'border-white/20 hover:border-white/40'
          }`}
        >
          <span>클릭하거나 이미지를 끌어다 놓으세요</span>
          <span>jpg·png·webp·gif · 5MB 이하</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}

      {state === 'error' && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
