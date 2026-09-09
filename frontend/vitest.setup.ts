import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// jsdom이 이 환경에선 동작하는 Storage를 안 깔아준다(localStorage가 메서드 없는 빈
// 객체로 들어온다). 실제 브라우저엔 항상 있는 API라 테스트에서만 나는 문제이므로,
// 여기서 최소 인메모리 Storage로 채워 localStorage/sessionStorage를 쓸 수 있게 한다.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: new MemoryStorage(),
  });
}

// test.globals=false라 RTL의 자동 cleanup(afterEach 전역 의존)이 안 걸린다 — 직접 등록
afterEach(() => {
  cleanup();
});
