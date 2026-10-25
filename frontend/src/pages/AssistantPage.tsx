import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flight, Preference, Search } from '../types';
import { SearchForm } from '../components/SearchForm';
import { FlightCard } from '../components/FlightCard';
import { Alert, Empty, PageHead } from '../components/common';
import { errorMessage, get, post } from '../services/api';
import { dayAfter } from '../utils/format';
export default function AssistantPage() {
  const [query, setQuery] = useState('Tôi muốn chuyến bay tiết kiệm, phù hợp với ngân sách.');
  const [search, setSearch] = useState<Search | null>(null), [pref, setPref] = useState<Preference | null>(null), [result, setResult] = useState<{ message: string; flights: Flight[] } | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { get<Preference | null>('/users/preferences').then(setPref).catch(e => setError(errorMessage(e))); }, []);
  async function recommend(s: Search) {
    setSearch(s); setBusy(true); setError('');
    try { setResult(await post('/assistant/recommend', { query, search: s })); } catch(e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <div className="container page"><PageHead tag="GỢI Ý CÁ NHÂN HÓA" title="Một chuyến bay hợp với bạn.">Hãy cho chúng tôi biết bạn ưu tiên điều gì trong hành trình.</PageHead><div className="assistant-intro"><span>✦</span><div><strong>Chọn thông minh, bay thảnh thơi</strong><p>Gợi ý dựa trên giá đã gồm thuế, thời gian bay, ngân sách và hãng yêu thích. Công cụ dùng thuật toán chấm điểm có trọng số, không phải tư vấn từ hãng hàng không.</p><Link to="/profile">Cập nhật sở thích bay →</Link></div></div><div className="panel"><label>Bạn mong muốn điều gì?<textarea maxLength={1000} minLength={1} required value={query} onChange={e => setQuery(e.target.value)} placeholder="Ví dụ: Tôi muốn vé rẻ, ưu tiên Vietnam Airlines…" /></label><div className="prompt-chips">{['Tìm vé rẻ để tiết kiệm chi phí','Ưu tiên chuyến bay nhanh nhất','Cân bằng chi phí và thời gian'].map(t => <button type="button" key={t} onClick={() => setQuery(t)}>{t}</button>)}</div></div><SearchForm busy={busy} key={pref?.cabinClass ?? 'default'} initial={{ date: dayAfter(), cabinClass: pref?.cabinClass ?? 'ECONOMY' }} onSearch={s => { if (!busy && query.trim()) void recommend(s); }} />{busy && <p role="status" className="loading">Đang so sánh các chuyến bay…</p>}{error && <Alert>{error}</Alert>}{result && <section className="section"><h2>Gợi ý cho hành trình của bạn</h2><p className="muted">{result.message}</p>{!result.flights.length ? <Empty>Thử một ngày hoặc đường bay khác.</Empty> : result.flights.map((f,i) => <div key={f.id}><span className="recommend-label">0{i+1} · {i === 0 ? 'PHÙ HỢP NHẤT' : 'LỰA CHỌN THAM KHẢO'}</span><FlightCard flight={f} /><Link className="text-button" to={`/checkout?outbound=${f.selectedFare?.id}&passengers=${search?.passengers ?? 1}`}>Đặt chuyến này →</Link></div>)}</section>}</div>;
}
