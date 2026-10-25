import PasswordInput from '../components/PasswordInput';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage, post } from '../services/api';
import { User } from '../types';
import { Alert, Plane } from '../components/common';
export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, accept } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const next = params.get('next'); const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/bookings';
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  if (user) return <Navigate to={destination} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const session = await post<{ user: User; accessToken: string }>(`/auth/${register ? 'register' : 'login'}`, { email, password, ...(register ? { fullName: name } : {}) }); accept(session); navigate(destination, { replace: true }); }
    catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="auth-wrap"><div className="auth-art"><span className="eyebrow light">WELCOME ABOARD</span><h1>Hành trình đẹp<br />bắt đầu từ đây.</h1><Plane /><p>Lưu chuyến bay yêu thích, quản lý vé và nhận gợi ý dành riêng cho bạn.</p></div><div className="auth-form"><span className="eyebrow">FLIGHT TICKETS PLATFORM</span><h1>{register ? 'Tạo tài khoản' : 'Chào mừng trở lại.'}</h1><p>{register ? 'Sẵn sàng cho những chân trời mới?' : 'Đăng nhập để tiếp tục hành trình của bạn.'}</p>{error && <Alert>{error}</Alert>}<form onSubmit={submit}>{register && <label>Họ và tên<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>}<label>Email<input required type="email" maxLength={255} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Mật khẩu<PasswordInput required minLength={register ? 8 : 1} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>{register && <small className="muted">Tối thiểu 8 ký tự, tối đa 72 byte.</small>}{!register && <Link className="forgot-link" to="/forgot-password">Quên mật khẩu?</Link>}<button className="button full" disabled={busy}>{busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản ↗' : 'Đăng nhập ↗'}</button></form><p className="auth-alternate">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <Link to={`${register ? '/login' : '/register'}?next=${encodeURIComponent(destination)}`}>{register ? 'Đăng nhập' : 'Đăng ký ngay'}</Link></p></div></div>;
}
export function RecoveryPage({ reset = false }: { reset?: boolean }) {
  const [params] = useSearchParams(); const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await post(`/auth/${reset ? 'reset-password' : 'forgot-password'}`, reset ? { token: params.get('token'), password } : { email }); setMessage(reset ? 'Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.' : 'Nếu tài khoản tồn tại, email khôi phục sẽ được gửi. Hãy kiểm tra cả thư mục spam.'); }
    catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="container page narrow"><section className="panel"><span className="eyebrow">TÀI KHOẢN CỦA BẠN</span><h1>{reset ? 'Đặt mật khẩu mới' : 'Khôi phục mật khẩu'}</h1>{error && <Alert>{error}</Alert>}{message ? <><Alert good>{message}</Alert><Link to="/login">Đăng nhập →</Link></> : <form onSubmit={submit}>{reset ? <label>Mật khẩu mới<PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label> : <label>Email tài khoản<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}<button disabled={busy} className="button">{busy ? 'Đang xử lý…' : reset ? 'Lưu mật khẩu mới' : 'Gửi liên kết khôi phục'}</button></form>}</section></div>;
}
