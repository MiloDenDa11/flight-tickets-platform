import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage, get } from '../services/api';
import Icon from './Icon';

export function Plane({ className = '' }: { className?: string }) { return <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m28 4-9 13-2 11-4-2 1-9-9 2-2-4 11-4L24 3c2-2 6-1 4 1Z" fill="currentColor" /></svg>; }
export function Spinner() { return <div className="loading" role="status"><span className="spinner" aria-hidden="true" /> Đang tải dữ liệu…</div>; }
export function Alert({ children, good = false, id }: { children: ReactNode; good?: boolean; id?: string }) { return <div id={id} className={`alert ${good ? 'good' : ''}`} role={good ? 'status' : 'alert'}><Icon name={good ? 'check' : 'info'} /><div>{children}</div></div>; }
export function Empty({ children }: { children: ReactNode }) { return <div className="empty"><Plane /><h3>Chưa có dữ liệu phù hợp</h3><p>{children}</p></div>; }
export function PageHead({ tag, title, children }: { tag: string; title: string; children?: ReactNode }) { return <div className="page-head"><div className="page-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><span>{tag}</span></div><span className="eyebrow">{tag}</span><h1>{title}</h1>{children && <p>{children}</p>}</div>; }
export function useResource<T>(url: string, revision = 0) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; setLoading(true); setError(''); get<T>(url).then(d => { if (live) setData(d); }).catch(e => { if (live) setError(errorMessage(e)); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [url, revision, attempt]);
  return { data, error, loading, setData, retry: () => setAttempt(v => v + 1) };
}
export function Protected({ admin = false }: { admin?: boolean }) {
  const { user, loading } = useAuth(); const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && user.role !== 'ADMIN') return <div className="container page"><Alert>Bạn không có quyền truy cập trang quản trị.</Alert><Link to="/">Về trang chủ</Link></div>;
  return <Outlet />;
}
export function Layout() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const [error, setError] = useState(''); const [menu, setMenu] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const drawer = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setMenu(false);
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
    else window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', scroll, { passive: true }); scroll();
    return () => window.removeEventListener('scroll', scroll);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLElement>('button, a')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenu(false); toggle.current?.focus(); }
      if (event.key === 'Tab') {
        const items = drawer.current?.querySelectorAll<HTMLElement>('a, button');
        if (!items?.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key); toggle.current?.focus(); };
  }, [menu]);
  const navigation = <><NavLink to="/" end>Trang chủ</NavLink><NavLink to="/flights">Tìm chuyến bay</NavLink><Link to="/#destinations">Điểm đến</Link><Link to="/#cultures">Khám phá</Link><NavLink to="/bookings">Đặt chỗ của tôi</NavLink></>;
  async function signOut() { setError(''); try { await logout(); navigate('/'); } catch (e) { setError(errorMessage(e)); } }
  return <>
    <a href="#main-content" className="skip-link">Bỏ qua đến nội dung chính</a>
    <div className="topbar"><div className="container"><span><Icon name="globe" /> Mở ra thế giới. Bắt đầu từ một hành trình.</span><span>Trải nghiệm đặt vé demo <i /> Giá đã gồm thuế & phí <b>VI · VND</b></span></div></div>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}><div className={`container nav ${isAdmin ? 'has-admin-access' : ''}`}>
      <Link className="brand" to="/" aria-label="Flight Tickets — Trang chủ"><span className="brand-icon"><Plane /></span><span>flight<span className="brand-light">tickets</span><small>EVERY JOURNEY, A NEW STORY</small></span></Link>
      <nav className="nav-links" aria-label="Điều hướng chính">{navigation}</nav>
      <div className="nav-account">{user ? <>{isAdmin && <Link className="admin-mode-link" to="/admin" aria-label="Vào trang quản trị" title="Vào trang quản trị"><Icon name="shield" /><span>Quản trị</span></Link>}<Link className="profile-link" to="/profile" aria-label={`Tài khoản ${user.fullName}`}><span className="avatar">{user.fullName.charAt(0)}</span><span>{user.fullName.split(' ').slice(-2).join(' ')}</span></Link><button className="text-button signout" onClick={signOut}>Đăng xuất</button></> : <><Link className="login-link" to="/login">Đăng nhập</Link><Link className="button small register-link" to="/register">Đăng ký <Icon name="northeast" /></Link></>}</div>
      <button ref={toggle} className="menu-toggle" aria-label="Mở menu điều hướng" aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(true)}><Icon name="menu" /></button>
    </div></header>
    {menu && <div className="drawer-backdrop" onClick={() => setMenu(false)}><div ref={drawer} id="mobile-navigation" className="mobile-drawer" role="dialog" aria-label="Điều hướng" aria-modal="true" onClick={e => e.stopPropagation()}><div className="drawer-heading"><strong>Hành trình của bạn</strong><button aria-label="Đóng menu" onClick={() => { setMenu(false); toggle.current?.focus(); }}><Icon name="close" /></button></div><nav>{navigation}<NavLink to="/assistant">Gợi ý cá nhân hóa</NavLink><NavLink to="/favorites">Đường bay yêu thích</NavLink><NavLink to="/profile">Tài khoản của tôi</NavLink>{user?.role === 'ADMIN' && <NavLink to="/admin">Trung tâm quản trị</NavLink>}</nav><div className="drawer-account">{user ? <button className="button full" onClick={signOut}>Đăng xuất</button> : <><Link className="button full" to="/login">Đăng nhập</Link><Link className="button ghost full" to="/register">Tạo tài khoản</Link></>}</div><p>Flight Tickets Platform<br /><span>VI · VND</span></p></div></div>}
    {error && <div className="container"><Alert>{error}</Alert></div>}
    <main id="main-content" tabIndex={-1}><Outlet /></main>
    <footer className="footer"><div className="container footer-grid"><div className="footer-brand"><Link className="brand" to="/"><span className="brand-icon"><Plane /></span><span>flight<span className="brand-light">tickets</span></span></Link><p>Những chân trời mới, những câu chuyện mới.<br />Tìm hành trình mang dấu ấn của bạn.</p><span className="footer-location"><Icon name="globe" /> Việt Nam · Tiếng Việt · VND</span></div><div><strong>Khám phá</strong><Link to="/">Tìm chuyến bay</Link><Link to="/#destinations">Điểm đến nổi bật</Link><Link to="/#airlines">Hãng hàng không</Link><Link to="/assistant">Gợi ý hành trình</Link></div><div><strong>Hành trình của bạn</strong><Link to="/bookings">Quản lý đặt chỗ</Link><Link to="/favorites">Đường bay yêu thích</Link><Link to="/profile">Tài khoản & sở thích</Link>{user?.role === 'ADMIN' && <Link to="/admin">Trung tâm quản trị</Link>}</div><div><strong>Thông tin & hỗ trợ</strong><Link to="/#faq">Câu hỏi thường gặp</Link><Link to="/forgot-password">Khôi phục mật khẩu</Link><a href="/images/credits.html" target="_blank" rel="noreferrer">Nguồn hình ảnh</a><a href="/asset-credits.html" target="_blank" rel="noreferrer">Tài nguyên & bản quyền</a></div></div><div className="container footer-disclosure"><Icon name="info" /><p>Môi trường demo: lịch bay, giao dịch và vé mô phỏng. Chỉ hãng bay và giá do API trả về mới xuất hiện trong kết quả tìm kiếm. Vé demo không dùng để làm thủ tục tại sân bay.</p></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Flight Tickets Platform</span><span>Every journey begins with possibility. <Icon name="northeast" /></span></div></footer>
  </>;
}
