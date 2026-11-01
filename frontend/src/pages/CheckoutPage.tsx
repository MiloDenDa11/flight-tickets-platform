import BookingSteps from '../components/BookingSteps';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Booking, Fare, Flight, Passenger } from '../types';
import { Alert, PageHead, Spinner } from '../components/common';
import { errorMessage, get, post } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { cabinName, clock, dateLabel, dayAfter, money } from '../utils/format';
type Selection = Fare & { flight: Flight };
export default function CheckoutPage() {
  const [params] = useSearchParams(); const { user } = useAuth(); const navigate = useNavigate();
  const [fares, setFares] = useState<Selection[] | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const countRaw = Number(params.get('passengers') ?? 1); const count = Number.isInteger(countRaw) && countRaw >= 1 && countRaw <= 9 ? countRaw : 1;
  const [passengers, setPassengers] = useState<Passenger[]>(Array.from({ length: count }, () => ({ fullName: '', dateOfBirth: '', documentNumber: '', nationality: 'VN' })));
  const [contactEmail, setEmail] = useState(user?.email ?? ''), [phone, setPhone] = useState(user?.phone ?? ''), [consent, setConsent] = useState(false);
  const request = useRef({ payload: '', key: crypto.randomUUID() as string });
  useEffect(() => {
    const ids = [params.get('outbound'), params.get('inbound')].filter(Boolean);
    if (!ids.length || ids.some(i => !/^\d+$/.test(i!))) { setError('Vui lòng chọn chuyến bay trước khi đặt vé.'); return; }
    let live = true;
    Promise.all(ids.map(id => get<Selection>(`/fares/${id}`))).then(f => { if (live) setFares(f); }).catch(e => { if (live) setError(errorMessage(e)); });
    return () => { live = false; };
  }, [params.toString()]);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!fares || busy) return; setError(''); setBusy(true);
    const payload = { fareIds: fares.map(f => f.id), passengers, contactEmail, contactPhone: phone };
    if (request.current.payload !== JSON.stringify(payload)) request.current = { payload: JSON.stringify(payload), key: crypto.randomUUID() };
    try { const b = await post<Booking>('/bookings', { ...payload, idempotencyKey: request.current.key }); navigate(`/bookings/${b.id}`, { replace: true }); }
    catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="container page"><BookingSteps current={2} /><PageHead tag="ĐẶT VÉ · BƯỚC 2 / 3" title="Chỉ còn một bước đến hành trình mới.">Nhập thông tin đúng với giấy tờ sẽ sử dụng khi bay.</PageHead>{error && <Alert>{error}</Alert>}{!fares ? error ? <Link to="/">Chọn chuyến bay →</Link> : <Spinner /> : <form className="checkout-grid" onSubmit={submit}><div>
    {passengers.map((p,i) => <section className="panel" key={i}><div className="panel-heading"><span className="step-number">{i+1}</span><h2>Hành khách {i+1}</h2></div><div className="form-grid"><label>Họ và tên trên giấy tờ<input required minLength={2} maxLength={100} autoComplete="name" placeholder="NGUYEN MINH ANH" value={p.fullName} onChange={e => setPassengers(passengers.map((v,j) => j === i ? { ...v, fullName: e.target.value } : v))} /></label><label>Ngày sinh<input required type="date" max={dayAfter(0)} value={p.dateOfBirth} onChange={e => setPassengers(passengers.map((v,j) => j === i ? { ...v, dateOfBirth: e.target.value } : v))} /></label><label>Số CCCD / hộ chiếu<input required pattern="[A-Za-z0-9-]{5,30}" maxLength={30} value={p.documentNumber} onChange={e => setPassengers(passengers.map((v,j) => j === i ? { ...v, documentNumber: e.target.value } : v))} /></label><label>Quốc tịch<select value={p.nationality} onChange={e => setPassengers(passengers.map((v,j) => j === i ? { ...v, nationality: e.target.value } : v))}><option value="VN">Việt Nam</option><option value="US">Hoa Kỳ</option><option value="SG">Singapore</option><option value="TH">Thái Lan</option><option value="KR">Hàn Quốc</option><option value="JP">Nhật Bản</option></select></label></div></section>)}
    <section className="panel"><h2>Thông tin liên hệ</h2><p className="muted">Mã đặt chỗ và vé sẽ được lưu trong tài khoản của bạn.</p><div className="form-grid"><label>Email<input required type="email" maxLength={255} value={contactEmail} onChange={e => setEmail(e.target.value)} /></label><label>Số điện thoại<input required type="tel" pattern="\+?[0-9 ()-]{8,25}" value={phone} onChange={e => setPhone(e.target.value)} /></label></div></section></div>
    <aside className="panel order-summary"><span className="eyebrow">HÀNH TRÌNH ĐÃ CHỌN</span>{fares.map((f,i) => <div className="summary-segment" key={f.id}><small>{i === 0 ? 'CHUYẾN ĐI' : 'CHUYẾN VỀ'} · {dateLabel(f.flight.departureTime, f.flight.origin.timezone)}</small><h3>{f.flight.origin.code} → {f.flight.destination.code}</h3><p>{f.flight.airline.name} · {f.flight.flightNumber}<br />{clock(f.flight.departureTime, f.flight.origin.timezone)} — {clock(f.flight.arrivalTime, f.flight.destination.timezone)} (giờ địa phương)<br />{cabinName(f.cabinClass)} · Ký gửi {f.baggageKg}kg</p><div className="price-line"><span>Giá gốc × {count}</span><span>{money(f.basePrice * count)}</span></div><div className="price-line"><span>Thuế & phí × {count}</span><span>{money(f.tax * count)}</span></div><small>{f.refundable ? 'Cho phép hoàn tiền trước giờ bay (demo)' : 'Không hoàn sau thanh toán'}</small></div>)}<div className="total-line"><span>Tổng thanh toán</span><strong>{money(fares.reduce((s,f) => s+f.basePrice+f.tax,0)*count)}</strong></div><label className="checkbox"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required /><span>Tôi đã kiểm tra thông tin hành khách và đồng ý với điều kiện hạng vé đã chọn.</span></label><button className="button full" type="submit" disabled={busy || !consent || fares.some(f => f.availableSeats < count)}>{busy ? 'Đang giữ chỗ…' : 'Giữ chỗ & tiếp tục ↗'}</button><p className="small-note">Đây là hệ thống demo. Bước tiếp theo dùng thanh toán mô phỏng, không thu tiền thật.</p></aside></form>}</div>;
}
