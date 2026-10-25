import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Flight, Review } from '../types';
import { useResource, Spinner, Alert, PageHead } from '../components/common';
import { FlightCard } from '../components/FlightCard';
import { cabinName, money } from '../utils/format';
export default function FlightDetailPage() {
  const { id } = useParams(); const { data: f, error, loading } = useResource<Flight>(`/flights/${id}`);
  const [count, setCount] = useState(1);
  if (loading) return <Spinner />; if (error || !f) return <div className="container page"><Alert>{error || 'Không tìm thấy chuyến bay'}</Alert></div>;
  return <div className="container page"><PageHead tag="CHI TIẾT CHUYẾN BAY" title={`${f.origin.city} → ${f.destination.city}`}>{f.flightNumber} · {f.airline.name}</PageHead><FlightCard flight={f} /><div className="section-heading"><h2>Chọn hạng vé của bạn</h2><label className="inline-label">Hành khách<select value={count} onChange={e => setCount(+e.target.value)}>{Array.from({ length: 9 },(_,i) => <option key={i} value={i+1}>{i+1}</option>)}</select></label></div><div className="fare-grid">{f.fares.map(fare => <article className="panel fare-card" key={fare.id}><span className="eyebrow">{fare.cabinClass}</span><h3>{cabinName(fare.cabinClass)}</h3><strong className="fare-price">{money(fare.basePrice + fare.tax)}</strong><p>Giá gốc: {money(fare.basePrice)}<br />Thuế & phí: {money(fare.tax)}</p><ul><li>Hành lý xách tay: {fare.cabinBaggageKg}kg</li><li>Hành lý ký gửi: {fare.baggageKg}kg</li><li>{fare.refundable ? 'Được hủy và hoàn tiền trước giờ bay (demo)' : 'Vé không hoàn sau thanh toán'}</li><li>Còn {fare.availableSeats} ghế</li></ul>{fare.availableSeats >= count && f.status === 'SCHEDULED' && +new Date(f.departureTime) > Date.now() + 3600000 ? <Link className="button" to={`/checkout?outbound=${fare.id}&passengers=${count}`}>Đặt {count} vé ↗</Link> : <button className="button" disabled>Không đủ điều kiện đặt</button>}</article>)}</div><AirlineReviews id={f.airline.id} /></div>;
}
function AirlineReviews({ id }: { id: number }) {
  const { data, error } = useResource<Review[]>(`/airlines/${id}/reviews`);
  return <section className="section"><h2>Đánh giá hãng bay</h2>{error && <Alert>{error}</Alert>}{!data?.length ? <p className="muted">Chưa có đánh giá được công khai.</p> : data.map(r => <div className="panel review" key={r.id}><strong>{r.user.fullName} · {'★'.repeat(r.rating)}</strong><p>{r.comment}</p></div>)}</section>;
}
