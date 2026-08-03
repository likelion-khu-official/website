import path from 'node:path';

export const AUTH_DIR = path.join(__dirname, '.auth');

// global-setup이 채우고, projects의 storageState / 테스트에서 그대로 참조한다.
export const STORAGE_STATE = {
  visitor: path.join(AUTH_DIR, 'visitor.json'),
  admin: path.join(AUTH_DIR, 'admin.json'),
  superAdmin: path.join(AUTH_DIR, 'super-admin.json'),
} as const;
