import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flight } from '../../types';
import { dayAfter, dateLabel, money } from '../../utils/format';
import { errorMessage, get } from '../../services/api';
import { Alert } from '../common';
import AirlineMark from '../AirlineMark';
import Icon from '../Icon';
import Reveal from '../Reveal';
export default function FlightHighlights() {
  const [flights, setFlights] = useState<Flight[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    Promise.allSettled(['HAN','DAD','SIN'].map(destination => get<{ flights: Flight[] }>('/flights', { origin: 'SGN', destination, date: dayAfter(2), passengers: 1, cabinClass: 'ECONOMY', sort: 'PRICE' }))).then(results => {
      if (!live) return;
      const rows = results.flatMap(r => r.status === 'fulfilled' && r.value.flights[0] ? [r.value.flights[0]] : []);
      setFlights(rows);
      const failed = results.find(r => r.status === 'rejected');
      if (!rows.length && failed?.status === 'rejected') setError(errorMessage(failed.reason));
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [attempt]);
  return <section className="highlights-section"><div className="container section"><Reveal><div className="section-heading"><div><span className="eyebrow">A GOOD DAY TO GET AWAY</span><h2>Thêm một lý do để cất cánh.</h2><p>Những chuyến bay từ TP. Hồ Chí Minh, lấy trực tiếp từ dữ liệu tìm kiếm hiện tại.</p></div><Link className="arrow-link" to={`/flights?origin=SGN&destination=HAN&date=${dayAfter(2)}&passengers=1&cabinClass=ECONOMY`}>Khám phá chuyến bay <span><Icon name="northeast" /></span></Link></div></Reveal>
    {error ? <Alert>{error}<button onClick={() => setAttempt(v => v+1)} className="text-button">Thử lại</button></Alert> : loading ? <div className="highlight-grid" aria-label="Đang tải chuyến bay">{[1,2,3].map(n => <div className="highlight-skeleton skeleton" key={n} />)}</div> : !flights.length ? <div className="highlights-empty"><Icon name="calendar" /><p>Chưa có chuyến cho những hành trình này vào ngày {dateLabel(dayAfter(2))}. Hãy chọn ngày khác trong form tìm kiếm.</p><a href="#flight-search" className="button ghost small">Chọn hành trình khác</a></div> : <div className="highlight-grid">{flights.map((f, i) => <Reveal key={f.id} delay={i * 60}><Link className={`highlight-card highlight-${i}`} to={`/flights/${f.id}`}><div className="highlight-top"><span className="highlight-date"><Icon name="calendar" />{dateLabel(f.departureTime)}</span><Icon name="northeast" /></div><div className="highlight-route"><span>{f.origin.code}</span><span className="highlight-path">✈</span><span>{f.destination.code}</span></div><h3>{f.origin.city} <span>→</span> {f.destination.city}</h3><div className="highlight-airline"><AirlineMark code={f.airline.code} name={f.airline.name} color={f.airline.color} /><span>{f.airline.name} · {f.flightNumber}</span></div><div className="highlight-price"><div><small>Giá vé / người, đã gồm thuế & phí</small><strong>{money(f.price ?? (f.selectedFare!.basePrice + f.selectedFare!.tax))}</strong></div><span className="highlight-open">Xem vé <Icon name="arrow" /></span></div></Link></Reveal>)}</div>}
    <p className="editorial-note">Giá và ghế có thể thay đổi; hệ thống xác nhận lại khi tạo đơn. Đây là dữ liệu của môi trường demo hiện tại.</p>
  </div></section>;
}
