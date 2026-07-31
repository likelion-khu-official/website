'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminApiError, uploadStaffImage } from '@/lib/adminApi';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const OUTPUT_SIZE = 1024;

interface ImageSize {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

export default function StaffImageCropper({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const dragRef = useRef<{ pointerId: number; start: Point; offset: Point } | null>(null);

  const [sourceUrl, setSourceUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [cropSize, setCropSize] = useState(360);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function scaleFor(nextZoom: number) {
    if (!imageSize) return 1;
    return Math.max(cropSize / imageSize.width, cropSize / imageSize.height) * nextZoom;
  }

  function clampOffset(next: Point, nextZoom = zoom): Point {
    if (!imageSize) return next;
    const size = cropSize;
    const scale = scaleFor(nextZoom);
    const maxX = Math.max(0, (imageSize.width * scale - size) / 2);
    const maxY = Math.max(0, (imageSize.height * scale - size) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  function closeCropper() {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = null;
    }
    setSourceUrl('');
    setImageSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (inputRef.current) inputRef.current.value = '';
  }

  function openFile(file: File) {
    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('jpg·png·webp 형식만 선택할 수 있어요.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('5MB 이하 사진만 선택할 수 있어요.');
      return;
    }

    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    sourceUrlRef.current = objectUrl;
    setSourceUrl(objectUrl);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function applyCrop() {
    if (!sourceUrl || !imageSize || !frameRef.current || uploading) return;
    setUploading(true);
    onUploadingChange(true);
    setError('');

    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();

      const size = frameRef.current.clientWidth;
      const scale = scaleFor(zoom);
      const displayedWidth = imageSize.width * scale;
      const displayedHeight = imageSize.height * scale;
      const originX = (size - displayedWidth) / 2 + offset.x;
      const originY = (size - displayedHeight) / 2 + offset.y;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이미지를 처리할 수 없어요.');

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        -originX / scale,
        -originY / scale,
        size / scale,
        size / scale,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('이미지를 처리할 수 없어요.'))),
          'image/webp',
          0.9
        );
      });
      const file = new File([blob], 'staff-profile.webp', { type: 'image/webp' });

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const nextPreview = URL.createObjectURL(blob);
      previewUrlRef.current = nextPreview;
      setPreviewUrl(nextPreview);

      const uploaded = await uploadStaffImage(file);
      onChange(uploaded.url);
      closeCropper();
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : '사진을 처리하지 못했어요.');
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  const visibleImage = previewUrl || value;
  const scale = scaleFor(zoom);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
          {visibleImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visibleImage} alt="운영진 사진 미리보기" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-white/35">사진 없음</span>
          )}
        </div>
        <div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-50"
          >
            {uploading ? '업로드 중…' : visibleImage ? '사진 다시 선택' : '사진 선택'}
          </button>
          <p className="mt-2 text-xs leading-5 text-white/40">선택한 뒤 얼굴 위치와 크기를 조정할 수 있어요.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) openFile(file);
        }}
      />
      {error && !sourceUrl ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      {sourceUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-crop-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#171717] p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="staff-crop-title" className="text-lg font-semibold text-white">
                  사진 맞추기
                </h2>
                <p className="mt-1 text-sm text-white/45">드래그해서 얼굴을 원 안에 배치하세요.</p>
              </div>
              <button
                type="button"
                onClick={closeCropper}
                className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-white/70 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent"
              >
                취소
              </button>
            </div>

            <div
              ref={frameRef}
              className="relative mx-auto aspect-square w-full max-w-[420px] touch-none overflow-hidden rounded-2xl bg-black"
              onPointerDown={(event) => {
                if (!imageSize) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  start: { x: event.clientX, y: event.clientY },
                  offset,
                };
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                setOffset(
                  clampOffset({
                    x: drag.offset.x + event.clientX - drag.start.x,
                    y: drag.offset.y + event.clientY - drag.start.y,
                  })
                );
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceUrl}
                alt=""
                draggable={false}
                onLoad={(event) => {
                  setCropSize(frameRef.current?.clientWidth ?? 360);
                  const next = {
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  };
                  setImageSize(next);
                  setOffset({ x: 0, y: 0 });
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: imageSize ? `${imageSize.width * scale}px` : 'auto',
                  height: imageSize ? `${imageSize.height * scale}px` : 'auto',
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[2px] rounded-full ring-2 ring-white/90"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,.55)' }}
              />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/20" />
              <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/20" />
            </div>

            <label className="mt-5 block">
              <span className="mb-2 flex items-center justify-between text-sm text-white/60">
                <span>확대</span>
                <span>{Math.round(zoom * 100)}%</span>
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => {
                  const nextZoom = Number(event.target.value);
                  setZoom(nextZoom);
                  setOffset((current) => clampOffset(current, nextZoom));
                }}
                className="w-full accent-[#ff7710]"
              />
            </label>

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            <button
              type="button"
              disabled={!imageSize || uploading}
              onClick={applyCrop}
              className="mt-5 min-h-12 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-accent/85 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-50"
            >
              {uploading ? '사진 올리는 중…' : '이 위치로 사진 사용'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
