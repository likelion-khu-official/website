/** 어드민 비밀번호 정책: 최소 8자 + 영문 + 숫자. 위반 시 안내 메시지, 통과 시 null. */
export function validateAdminPassword(password: string): string | null {
  if (password.length < 8) return '비밀번호는 8자 이상이어야 해요.';
  if (!/[A-Za-z]/.test(password)) return '비밀번호에 영문을 포함해 주세요.';
  if (!/\d/.test(password)) return '비밀번호에 숫자를 포함해 주세요.';
  return null;
}
