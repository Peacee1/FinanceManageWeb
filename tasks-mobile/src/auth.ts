import type {Session} from './types';

export const apiUrl = 'https://tasks.peacee1.io.vn/api';
export async function authenticate(register: boolean, input: {email: string; password: string; name?: string}, fetcher: typeof fetch = fetch): Promise<Session | null> {
  const response = await fetcher(`${apiUrl}/auth/${register ? 'register' : 'login'}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({...input, email: input.email.trim(), clientType: 'native', loginType: 'owner'}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data.message === 'Thong tin dang nhap khong dung.' ? 'Email hoặc mật khẩu không đúng.' : data.message;
    throw new Error(message || 'Không thể đăng nhập. Vui lòng thử lại.');
  }
  if (register) return null;
  if (typeof data.token !== 'string' || !Number.isSafeInteger(data.user?.id) || data.user?.role !== 'owner') {
    throw new Error('Vui lòng sử dụng tài khoản cá nhân Peacee1.');
  }
  return data as Session;
}
