'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackKeyClick, type KeyClickKey } from '@/lib/publicAnalytics';

type Props = {
  href: string;
  analyticsKey: KeyClickKey;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  target?: string;
  rel?: string;
};

export default function TrackedAnalyticsLink({ analyticsKey, children, ...linkProps }: Props) {
  return (
    <Link {...linkProps} onClick={() => trackKeyClick(analyticsKey)}>
      {children}
    </Link>
  );
}
