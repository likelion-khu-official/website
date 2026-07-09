import { headers } from 'next/headers';

/**
 * 서버 컴포넌트에서 자기 자신(Next.js 서버)을 향한 절대 URL이 필요할 때 쓴다.
 * fetch()는 상대경로를 못 받기 때문에 필요 — 백엔드 주소를 직접 쓰지 않고
 * 항상 이 서버의 /api/* (next.config.ts rewrite)로 보내 프록시를 그대로 태운다.
 */
export async function getBaseUrl() {
  const h = await headers();
  const host = h.get('host');
  const protocol = h.get('x-forwarded-proto') ?? 'http';
  return `${protocol}://${host}`;
}
