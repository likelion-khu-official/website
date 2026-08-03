'use client';

import { useState } from 'react';

export default function MarkdownImage({
  src,
  alt,
}: {
  src: string | Blob;
  alt: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="my-8 h-auto max-h-[80svh] w-full rounded-2xl border border-white/10 bg-white/[0.025] object-contain"
      onError={() => setImgError(true)}
    />
  );
}
