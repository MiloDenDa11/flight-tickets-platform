import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flight } from '../types';
import { cabinName, clock, dateLabel, duration, money } from '../utils/format';
import AirlineMark from './AirlineMark';
import Icon from './Icon';
import { Plane } from './common';

export function FlightCard({ flight: f, onSelect, label = 'Chọn chuyến' }: { flight: Flight; onSelect?: () => void; label?: string }) {
  const [expanded, setExpanded] = useState(false);
  const fare = f.selectedFare ?? f.fares[0];
  if (!fare) return <article className="flight-card no-fare"><p>{f.flightNumber} chưa có hạng vé để hiển thị.</p><Link to={`/flights/${f.id}`} className="text-button">Xem chuyến bay</Link></article>;
  return <article className="flight-card">
    <div className="airline-name"><AirlineMark code={f.airline.code} name={f.airline.name} color={f.airline.color} /><div><strong>{f.airline.name}</strong><small>{f.flightNumber} · {f.aircraft}</small></div></div>
    <div className="flight-times"><div><strong>{clock(f.departureTime, f.origin.timezone)}</strong><span>{f.origin.code}</span><small>{dateLabel(f.departureTime, f.origin.timezone)}</small></div><div className="route-line"><span>{duration(f.departureTime, f.arrivalTime)}</span><div><i /><Plane /><i /></div><small>Bay thẳng</small></div><div><strong>{clock(f.arrivalTime, f.destination.timezone)}</strong><span>{f.destination.code}</span><small>{dateLabel(f.arrivalTime, f.destination.timezone)}</small></div></div>
    <div className="flight-price"><small>Trọn gói / hành khách</small><strong>{money(fare.basePrice + fare.tax)}</strong>{onSelect ? <button className="button small" onClick={onSelect}>{label}<Icon name="northeast" /></button> : <Link className="button small" to={`/flights/${f.id}`}>Xem hạng vé<Icon name="northeast" /></Link>}</div>
    <div className="flight-meta"><span><Icon name="seat" />{cabinName(fare.cabinClass)}</span><span><Icon name="bag" />Xách tay {fare.cabinBaggageKg}kg · Ký gửi {fare.baggageKg}kg</span><span className="seat-availability"><span />Còn {fare.availableSeats} ghế</span><button className="flight-expand" aria-expanded={expanded} aria-controls={`flight-details-${f.id}`} onClick={() => setExpanded(!expanded)}>Chi tiết <Icon name="chevron" /></button></div>
    {expanded && <div className="flight-expanded" id={`flight-details-${f.id}`}><div><strong>Hành trình</strong><p>{f.origin.name} ({f.origin.code}) → {f.destination.name} ({f.destination.code})<br />Giờ đi: {clock(f.departureTime, f.origin.timezone)} · {f.origin.timezone}<br />Giờ đến: {clock(f.arrivalTime, f.destination.timezone)} · {f.destination.timezone}</p></div><div><strong>Giá & điều kiện hạng vé</strong><p>Giá gốc: {money(fare.basePrice)} · Thuế & phí: {money(fare.tax)}<br />{fare.refundable ? 'Cho phép hoàn trước giờ bay theo điều kiện vé (demo).' : 'Không hoàn vé sau khi thanh toán.'}</p><Link className="text-button" to={`/flights/${f.id}`}>Xem tất cả hạng vé <Icon name="arrow" /></Link></div></div>}
  </article>;
}
export function FlightSkeletons() {
  return <div className="flight-skeletons" role="status" aria-label="Đang tìm chuyến bay"><span className="sr-only">Đang tải kết quả tìm chuyến bay…</span>{[1,2,3].map(n => <div className="flight-skeleton" key={n}><div className="skeleton skeleton-airline" /><div><div className="skeleton skeleton-times" /><div className="skeleton skeleton-info" /></div><div className="skeleton skeleton-price" /></div>)}</div>;
}
