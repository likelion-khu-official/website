import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// test.globals=false라 RTL의 자동 cleanup(afterEach 전역 의존)이 안 걸린다 — 직접 등록
afterEach(() => {
  cleanup();
});
