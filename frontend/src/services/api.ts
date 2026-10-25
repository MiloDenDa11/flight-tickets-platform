import axios from 'axios';
const configured = import.meta.env.VITE_API_URL || '/api/v1';
export const api = axios.create({ baseURL: configured, withCredentials: true, timeout: 20000 });
let accessToken: string | null = null;
export function setToken(token: string | null) { accessToken = token; }
api.interceptors.request.use(config => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; return config; });
let refreshing: Promise<string> | null = null;
api.interceptors.response.use(r => r, async error => {
  const config = error.config;
  if (error.response?.status !== 401 || !config || config._retried || config.url?.startsWith('/auth/')) throw error;
  config._retried = true;
  refreshing ??= api.post('/auth/refresh').then(r => { setToken(r.data.data.accessToken); return r.data.data.accessToken as string; }).finally(() => { refreshing = null; });
  try { const token = await refreshing; config.headers.Authorization = `Bearer ${token}`; return await api(config); }
  catch { setToken(null); window.dispatchEvent(new Event('flight-session-expired')); throw error; }
});
export async function get<T>(url: string, params?: unknown): Promise<T> { return (await api.get(url, { params })).data.data; }
export async function post<T>(url: string, data?: unknown): Promise<T> { return (await api.post(url, data)).data.data; }
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data;
    if (body?.errors?.fieldErrors) {
      const issue = Object.entries(body.errors.fieldErrors).find(([, value]) => Array.isArray(value) && value.length);
      if (issue) return `${issue[0]}: ${(issue[1] as string[]).join(', ')}`;
    }
    return body?.message || (error.code === 'ECONNABORTED' ? 'Máy chủ phản hồi chậm. Vui lòng thử lại.' : 'Không kết nối được API. Hãy kiểm tra backend và database.');
  }
  return error instanceof Error ? error.message : 'Có lỗi xảy ra';
}
