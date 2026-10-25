import BookingSteps from '../components/BookingSteps';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Booking } from '../types';
import { Alert, Empty, PageHead, Spinner, useResource } from '../components/common';
import { api, errorMessage, post } from '../services/api';
import { cabinName, clock, dateLabel, money, statusName } from '../utils/format';

export default function BookingsPage() {
  const { data, error, loading } = useResource<Booking[]>('/bookings'); const [status, setStatus] = useState('ALL');
  const rows = data?.filter(b => status === 'ALL' || b.status === status);
  return <div className="container page"><PageHead tag="QUẢN LÝ HÀNH TRÌNH" title="Mỗi tấm vé, một câu chuyện.">Theo dõi đơn đặt vé, thanh toán và vé điện tử của bạn.</PageHead><div className="tabs">{['ALL','PENDING','CONFIRMED','EXPIRED','CANCELLED'].map(s => <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>{s === 'ALL' ? 'Tất cả' : statusName(s)}</button>)}</div>{error && <Alert>{error}</Alert>}{loading ? <Spinner /> : !rows?.length ? <Empty>Chưa có đơn phù hợp. <Link to="/">Tìm chuyến bay cho hành trình mới →</Link></Empty> : rows.map(b => <Link className="booking-card" key={b.id} to={`/bookings/${b.id}`}><div><span className={`badge ${b.status.toLowerCase()}`}>{statusName(b.status)}</span><small>Mã đặt chỗ <b>{b.reference}</b></small></div><h3>{b.segments.map(s => `${s.fare.flight.origin.code} → ${s.fare.flight.destination.code}`).join(' · ')}</h3><p>{b.passengers.length} hành khách · Ngày đặt {dateLabel(b.createdAt)}</p><div><strong>{money(b.totalAmount)}</strong><span>Xem chi tiết ↗</span></div></Link>)}</div>;
}
export function BookingDetailPage() {
  const { id } = useParams(); const [revision, setRevision] = useState(0);
  const { data: b, error, loading } = useResource<Booking>(`/bookings/${id}`, revision);
  const [busy, setBusy] = useState(false), [actionError, setError] = useState(''), [now, setNow] = useState(Date.now()), [confirm, setConfirm] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const left = b ? Math.max(0, Math.ceil((+new Date(b.expiresAt) - now) / 1000)) : 0;
  useEffect(() => { if (b?.status === 'PENDING' && !left) { const timer = setTimeout(() => setRevision(v => v+1), 1000); return () => clearTimeout(timer); } }, [left, b?.status]);
  async function action(type: 'pay' | 'cancel') {
    setBusy(true); setError('');
    try { await post(`/bookings/${id}/${type}`); setConfirm(false); setRevision(v => v+1); } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError('');
    try { const response = await api.get(`/bookings/${id}/tickets`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = `ticket-${b?.reference}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }
    catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  if (loading) return <Spinner />; if (error || !b) return <div className="container page"><Alert>{error || 'Đơn không tồn tại'}</Alert></div>;
  const canCancel = b.status === 'PENDING' || (b.status === 'CONFIRMED' && b.segments.every(s => s.refundable && +new Date(s.fare.flight.departureTime) > now));
  return <div className="container page"><BookingSteps current={3} /><Link className="back-link" to="/bookings">← Danh sách vé của tôi</Link><PageHead tag={`MÃ ĐẶT CHỖ · ${b.reference}`} title={b.status === 'CONFIRMED' ? 'Hành trình đã sẵn sàng.' : 'Chi tiết đặt vé'}><span className={`badge ${b.status.toLowerCase()}`}>{statusName(b.status)}</span></PageHead>{actionError && <Alert>{actionError}</Alert>}{b.status === 'PENDING' && <div className="hold-banner"><div><strong>Chỗ của bạn đang được giữ</strong><p>Hoàn tất thanh toán trước khi thời hạn kết thúc.</p></div><strong className="countdown">{Math.floor(left/60).toString().padStart(2,'0')}:{(left%60).toString().padStart(2,'0')}</strong></div>}
    <div className="checkout-grid"><div>{b.segments.map((s,i) => <article className="panel boarding-pass" key={s.id}><div><span className="eyebrow">{i ? 'CHUYẾN VỀ' : 'CHUYẾN ĐI'}</span><strong>{s.fare.flight.airline.name} · {s.fare.flight.flightNumber}</strong></div><div className="boarding-route"><div><strong>{s.fare.flight.origin.code}</strong><p>{s.fare.flight.origin.city}<br />{clock(s.fare.flight.departureTime, s.fare.flight.origin.timezone)} · {dateLabel(s.fare.flight.departureTime)}</p></div><span>✈</span><div><strong>{s.fare.flight.destination.code}</strong><p>{s.fare.flight.destination.city}<br />{clock(s.fare.flight.arrivalTime, s.fare.flight.destination.timezone)} · {dateLabel(s.fare.flight.arrivalTime)}</p></div></div><div className="ticket-info"><span>{cabinName(s.cabinClass)}</span><span>Xách tay {s.cabinBaggageKg}kg · Ký gửi {s.baggageKg}kg</span></div>{b.passengers.map(p => <div className="passenger-ticket" key={p.id}><strong>{p.fullName}</strong><span>{p.tickets?.find(t => t.segmentId === s.id)?.number ?? 'Chưa phát hành vé'}</span></div>)}<small className="muted">{s.refundable ? 'Cho phép hủy/hoàn trước giờ bay trong môi trường demo.' : 'Vé không hoàn sau khi thanh toán.'}</small></article>)}</div>
    <aside className="panel order-summary"><span className="eyebrow">THÔNG TIN THANH TOÁN</span><h3>{b.reference}</h3><p>{b.contactEmail}<br />{b.contactPhone}<br />{b.passengers.length} hành khách</p><div className="total-line"><span>Tổng cộng</span><strong>{money(b.totalAmount)}</strong></div>{b.payment && <p className="payment-note">{statusName(b.payment.status)} · {b.payment.provider}<small>{b.payment.transactionId}</small></p>}{b.status === 'PENDING' && <button className="button full" disabled={busy || !left} onClick={() => action('pay')}>{busy ? 'Đang xử lý…' : 'Thanh toán mô phỏng ↗'}</button>}{b.status === 'CONFIRMED' && <><button className="button full" disabled={busy} onClick={download}>Tải vé điện tử ↓</button><button className="button ghost full" onClick={() => window.print()}>In thông tin vé</button></>}{canCancel && !confirm && <button className="text-button danger full" disabled={busy} onClick={() => setConfirm(true)}>Hủy đơn đặt vé</button>}{confirm && <div className="confirm-box"><p>Xác nhận hủy đơn {b.reference}? {b.payment ? 'Khoản thanh toán mô phỏng sẽ được đánh dấu hoàn tiền.' : 'Ghế đang giữ sẽ được trả lại.'}</p><button className="button danger-button" disabled={busy} onClick={() => action('cancel')}>Xác nhận hủy</button><button className="text-button" disabled={busy} onClick={() => setConfirm(false)}>Giữ lại đơn</button></div>}<p className="small-note">Vé và thanh toán trong hệ thống này là mô phỏng. Không dùng vé demo để làm thủ tục tại sân bay.</p></aside></div></div>;
}
