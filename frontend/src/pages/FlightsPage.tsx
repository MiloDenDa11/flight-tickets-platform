import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Flight, Search, Airline } from '../types';
import { SearchForm } from '../components/SearchForm';
import { FlightCard, FlightSkeletons } from '../components/FlightCard';
import { Alert, Empty, PageHead, useResource } from '../components/common';
import { errorMessage, get, post } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { dayAfter, money } from '../utils/format';
export default function FlightsPage() {
  const [params, setParams] = useSearchParams(); const navigate = useNavigate(); const { user } = useAuth();
  const search: Search = { origin: params.get('origin') || 'SGN', destination: params.get('destination') || 'HAN', date: params.get('date') || dayAfter(), returnDate: params.get('returnDate') || undefined, passengers: params.get('passengers') || '1', cabinClass: params.get('cabinClass') || 'ECONOMY' };
  const [sort, setSort] = useState('PRICE'), [airline, setAirline] = useState(params.get('airline') ?? ''), [maxPrice, setMaxPrice] = useState(15000000);
  const [departureWindow, setDepartureWindow] = useState('ALL');
  const [outbound, setOutbound] = useState<Flight | null>(null), [returning, setReturning] = useState(false);
  const [data, setData] = useState<{ flights: Flight[]; total: number } | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const { data: airlines } = useResource<Airline[]>('/airlines'); const searchKey = params.toString();
  useEffect(() => { setOutbound(null); setReturning(false); setNotice(''); setAirline(params.get('airline') ?? ''); }, [searchKey]);
  useEffect(() => {
    let live = true; setLoading(true); setError('');
    const input = { ...search, origin: returning ? search.destination : search.origin, destination: returning ? search.origin : search.destination, date: returning ? search.returnDate : search.date, sort, airline: airline || undefined, maxPrice };
    get<{ flights: Flight[]; total: number }>('/flights', input).then(d => { if (live) setData(d); }).catch(e => { if (live) setError(errorMessage(e)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [searchKey, returning, sort, airline, maxPrice]);
  function choose(f: Flight) {
    if (search.returnDate && !returning) { setOutbound(f); setReturning(true); return; }
    const out = outbound?.selectedFare?.id ?? f.selectedFare?.id;
    navigate(`/checkout?outbound=${out}&passengers=${search.passengers}${returning ? `&inbound=${f.selectedFare?.id}` : ''}`);
  }
  async function favorite() {
    if (!user) { navigate('/login?next=' + encodeURIComponent('/flights?' + params)); return; }
    try { const f = data?.flights[0]; if (!f) return; await post('/users/favorites', { originId: f.origin.id, destinationId: f.destination.id }); setNotice('Đã lưu đường bay yêu thích.'); } catch(e) { setError(errorMessage(e)); }
  }
  const visibleFlights = data?.flights.filter(f => {
    if (departureWindow === 'ALL') return true;
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: f.origin.timezone }).format(new Date(f.departureTime)));
    return departureWindow === 'MORNING' ? hour >= 6 && hour < 12 : departureWindow === 'AFTERNOON' ? hour >= 12 && hour < 18 : departureWindow === 'EVENING' ? hour >= 18 : hour < 6;
  });
  return <div className="container page"><PageHead tag="CHUYẾN BAY CỦA BẠN" title={`${returning ? search.destination : search.origin} → ${returning ? search.origin : search.destination}`} >{returning ? 'Bước 2: Chọn chuyến về' : search.returnDate ? 'Bước 1: Chọn chuyến đi' : 'Chọn một khởi đầu cho hành trình mới'} · {search.passengers} hành khách</PageHead><SearchForm key={searchKey} compact busy={loading} initial={search} onSearch={s => { const p = new URLSearchParams(); Object.entries(s).forEach(([k,v]) => { if(v) p.set(k,v); }); setParams(p); }} />
    {outbound && returning && <div className="selected-outbound"><span>✓ Chuyến đi đã chọn: <b>{outbound.flightNumber}</b> · {money(outbound.price ?? 0)}/người</span><button className="text-button" onClick={() => { setReturning(false); setOutbound(null); }}>Chọn lại</button></div>}
    <div className="results-layout"><aside className="filter-panel"><h3>Lọc chuyến bay</h3><label>Hãng hàng không<select value={airline} onChange={e => setAirline(e.target.value)}><option value="">Tất cả hãng bay</option>{airlines?.map(a => <option key={a.id} value={a.code}>{a.name}</option>)}</select></label><label>Giá tối đa / người<strong>{money(maxPrice)}</strong><input aria-label="Giá vé tối đa" type="range" min={500000} max={15000000} step={100000} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} /></label><label>Giờ khởi hành<select aria-label="Lọc giờ khởi hành" value={departureWindow} onChange={e => setDepartureWindow(e.target.value)}><option value="ALL">Tất cả khung giờ</option><option value="MORNING">Sáng · 06:00–12:00</option><option value="AFTERNOON">Chiều · 12:00–18:00</option><option value="EVENING">Tối · 18:00–24:00</option><option value="NIGHT">Đêm · 00:00–06:00</option></select></label><button className="text-button" onClick={() => { setAirline(''); setMaxPrice(15000000); setDepartureWindow('ALL'); }}>Đặt lại bộ lọc</button><div className="filter-note">Giá đã gồm thuế & phí.<br />Giờ khởi hành và đến hiển thị theo múi giờ sân bay tương ứng.</div><Link to="/assistant" className="assistant-link">✦ Cần gợi ý? <span>Tìm chuyến phù hợp →</span></Link></aside>
    <section className="results"><div className="results-toolbar"><span>{loading ? 'Đang tìm chuyến…' : `${visibleFlights?.length ?? 0} chuyến bay phù hợp`}</span><label>Sắp xếp<select aria-label="Sắp xếp chuyến bay" value={sort} onChange={e => setSort(e.target.value)}><option value="PRICE">Giá thấp nhất</option><option value="DURATION">Bay nhanh nhất</option><option value="DEPARTURE">Khởi hành sớm</option><option value="RECOMMENDED">Đề xuất</option></select></label></div>{notice && <Alert good>{notice}</Alert>}{error ? <Alert>{error}</Alert> : loading ? <FlightSkeletons /> : !visibleFlights?.length ? <Empty>Không có chuyến phù hợp với bộ lọc này. Hãy đổi ngày, đường bay hoặc giá tối đa. Dữ liệu demo có lịch bay trong 35 ngày sau khi seed.</Empty> : <><button className="text-button save-route" onClick={favorite}>♡ Lưu đường bay này</button>{visibleFlights.map(f => <FlightCard key={f.id} flight={f} onSelect={() => choose(f)} label={returning ? 'Chọn chuyến về' : 'Chọn chuyến đi'} />)}</>}</section></div></div>;
}
