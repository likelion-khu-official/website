'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadImage, FeedApiError } from '@/lib/feedApi';

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
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);
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
    setProgress(0);
    setPreviewUrl(localPreview);
    onUploadingChange?.(true);

    try {
      const { url } = await uploadImage(file, setProgress);
      setState('done');
      setPreviewUrl(url);
      onChange(url);
    } catch (err) {
      setState('error');
      setError(err instanceof FeedApiError ? err.message : '이미지 업로드에 실패했어요.');
      onChange(null);
    } finally {
      onUploadingChange?.(false);
    }
  }

  function handleRemove() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreviewUrl(null);
    setState('idle');
    setError('');
    setProgress(0);
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

      {previewUrl ? (
        <div className="relative w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="업로드한 썸네일 미리보기"
            className="aspect-[16/9] w-full rounded-xl object-cover"
          />
          {state === 'uploading' && (
            <div className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-black/40">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80"
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
          className={`flex aspect-[16/9] w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center text-xs text-muted transition-colors ${
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
