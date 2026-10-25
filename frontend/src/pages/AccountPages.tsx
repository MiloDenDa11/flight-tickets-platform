import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Airline, Favorite, Preference, User } from '../types';
import { Alert, Empty, PageHead, Spinner, useResource } from '../components/common';
import { api, errorMessage, get, post } from '../services/api';
import { dayAfter } from '../utils/format';
export function ProfilePage() {
  const { user, update, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? ''), [phone, setPhone] = useState(user?.phone ?? ''), [current, setCurrent] = useState(''), [password, setPassword] = useState('');
  const [pref, setPref] = useState<Preference>({ cabinClass: 'ECONOMY', maxBudget: 3000000, preferredAirlines: [], prioritize: 'BALANCED' });
  const { data: airlines } = useResource<Airline[]>('/airlines'); const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { get<Preference | null>('/users/preferences').then(p => { if(p) setPref(p); }).catch(e => setError(errorMessage(e))); }, []);
  async function save(e: FormEvent, section: string) {
    e.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      if (section === 'profile') { const r = await api.patch('/users/profile', { fullName, phone }); update(r.data.data as User); }
      if (section === 'preferences') await api.put('/users/preferences', pref);
      if (section === 'password') { await post('/users/password', { currentPassword: current, password }); await logout(); return; }
      setMessage('Đã lưu thay đổi.');
    } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="container page"><PageHead tag="KHÔNG GIAN CỦA BẠN" title="Bay theo cách bạn muốn.">Quản lý thông tin và sở thích để nhận gợi ý phù hợp hơn.</PageHead>{error && <Alert>{error}</Alert>}{message && <Alert good>{message}</Alert>}<div className="account-grid"><form className="panel" onSubmit={e => save(e,'profile')}><h2>Thông tin cá nhân</h2><label>Email<input disabled value={user?.email ?? ''} /></label><label>Họ và tên<input required minLength={2} maxLength={100} value={fullName} onChange={e => setFullName(e.target.value)} /></label><label>Điện thoại<input type="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} /></label><button className="button" disabled={busy}>Lưu thông tin</button></form>
    <form className="panel" onSubmit={e => save(e,'preferences')}><h2>Sở thích bay</h2><label>Hạng vé mặc định<select value={pref.cabinClass} onChange={e => setPref({ ...pref, cabinClass: e.target.value })}><option value="ECONOMY">Phổ thông</option><option value="PREMIUM">Phổ thông đặc biệt</option><option value="BUSINESS">Thương gia</option></select></label><label>Ngân sách mỗi vé (VND)<input type="number" min={100000} max={100000000} step={100000} required value={pref.maxBudget} onChange={e => setPref({ ...pref, maxBudget: +e.target.value })} /></label><label>Ưu tiên<select value={pref.prioritize} onChange={e => setPref({ ...pref, prioritize: e.target.value })}><option value="BALANCED">Cân bằng giá & thời gian</option><option value="PRICE">Tiết kiệm chi phí</option><option value="DURATION">Thời gian bay ngắn</option></select></label><fieldset><legend>Hãng bay yêu thích</legend>{airlines?.map(a => <label className="checkbox" key={a.id}><input type="checkbox" checked={pref.preferredAirlines.includes(a.code)} onChange={e => setPref({ ...pref, preferredAirlines: e.target.checked ? [...pref.preferredAirlines,a.code] : pref.preferredAirlines.filter(c => c !== a.code) })} />{a.name}</label>)}</fieldset><button className="button" disabled={busy}>Lưu sở thích</button></form>
    <form className="panel" onSubmit={e => save(e,'password')}><h2>Đổi mật khẩu</h2><label>Mật khẩu hiện tại<input type="password" required autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} /></label><label>Mật khẩu mới<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><p className="small-note">Đổi mật khẩu sẽ kết thúc các phiên đăng nhập hiện tại.</p><button className="button" disabled={busy}>Đổi mật khẩu</button></form><ReviewForm /></div></div>;
}
function ReviewForm() {
  const { data: airlines } = useResource<Airline[]>('/airlines');
  const [airlineId, setAirline] = useState(''), [rating, setRating] = useState(5), [comment, setComment] = useState(''), [error, setError] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); setDone(false); try { await post('/users/reviews', { airlineId: +airlineId, rating, comment }); setDone(true); } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); } }
  return <form className="panel" onSubmit={submit}><h2>Chia sẻ trải nghiệm</h2><p className="muted">Bạn có thể đánh giá hãng sau khi hoàn tất chuyến bay đã đặt trong hệ thống.</p>{error && <Alert>{error}</Alert>}{done && <Alert good>Đã lưu đánh giá của bạn.</Alert>}<label>Hãng bay<select required value={airlineId} onChange={e => setAirline(e.target.value)}><option value="">Chọn hãng bay</option>{airlines?.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label><label>Điểm đánh giá<select value={rating} onChange={e => setRating(+e.target.value)}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} sao</option>)}</select></label><label>Cảm nhận<textarea required minLength={3} maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} /></label><button className="button" disabled={busy}>Gửi đánh giá</button></form>;
}
export function FavoritesPage() {
  const [revision, setRevision] = useState(0); const { data, error, loading } = useResource<Favorite[]>('/users/favorites',revision); const [actionError, setError] = useState('');
  async function remove(id: number) { try { await api.delete(`/users/favorites/${id}`); setRevision(v => v+1); } catch(e) { setError(errorMessage(e)); } }
  return <div className="container page"><PageHead tag="ĐƯỜNG BAY YÊU THÍCH" title="Những nơi bạn muốn trở lại.">Lưu đường bay từ trang kết quả để tìm lại nhanh hơn.</PageHead>{(error || actionError) && <Alert>{error || actionError}</Alert>}{loading ? <Spinner /> : !data?.length ? <Empty><Link to="/">Khám phá và lưu đường bay đầu tiên →</Link></Empty> : <div className="favorite-grid">{data.map(f => <article className="panel" key={f.id}><span className="eyebrow">YOUR FAVORITE ROUTE</span><h2>{f.origin.code} → {f.destination.code}</h2><p>{f.origin.city} — {f.destination.city}</p><Link className="button" to={`/flights?origin=${f.origin.code}&destination=${f.destination.code}&date=${dayAfter()}&passengers=1&cabinClass=ECONOMY`}>Tìm chuyến bay ↗</Link><button className="text-button danger" onClick={() => remove(f.id)}>Bỏ lưu</button></article>)}</div>}</div>;
}
