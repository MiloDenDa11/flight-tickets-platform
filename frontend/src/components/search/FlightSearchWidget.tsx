import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Airport, Search } from '../../types';
import { useResource, Alert } from '../common';
import Icon from '../Icon';
import AirportCombobox from './AirportCombobox';
import { cabinName, dayAfter } from '../../utils/format';

export function SearchForm({ initial, compact = false, onSearch, busy = false }: {
  initial?: Partial<Search>; compact?: boolean; onSearch?: (search: Search) => void | Promise<void>; busy?: boolean;
}) {
  const { data: airports, error, loading, retry } = useResource<Airport[]>('/airports');
  const navigate = useNavigate();
  const formId = useId(), errorId = `${formId}-error`, travelerId = `${formId}-travelers`;
  const formRoot = useRef<HTMLFormElement>(null);
  const [invalid, setInvalid] = useState<'route' | 'date' | 'returnDate' | ''>('');
  const [round, setRound] = useState(Boolean(initial?.returnDate));
  const [form, setForm] = useState<Search>({ origin: 'SGN', destination: 'HAN', date: dayAfter(), returnDate: dayAfter(4), passengers: '1', cabinClass: 'ECONOMY', ...initial });
  const [validation, setValidation] = useState(''), [submitting, setSubmitting] = useState(false), [travelersOpen, setTravelersOpen] = useState(false), [swapCount, setSwapCount] = useState(0);
  const travelerPanel = useRef<HTMLDivElement>(null);
  const locked = busy || submitting;
  useEffect(() => { if (validation) formRoot.current?.querySelector<HTMLInputElement>('[aria-invalid=true]')?.focus(); }, [validation]);
  useEffect(() => { setValidation(''); setInvalid(''); }, [form.origin, form.destination, form.date, form.returnDate]);
  useEffect(() => {
    setForm(previous => ({ ...previous, ...(initial?.origin ? { origin: initial.origin } : {}), ...(initial?.destination ? { destination: initial.destination } : {}) }));
  }, [initial?.origin, initial?.destination]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!travelerPanel.current?.contains(event.target as Node)) setTravelersOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    setValidation('');
    if (form.origin === form.destination) { setInvalid('route'); setValidation('Điểm đi và điểm đến phải khác nhau.'); return; }
    if (!airports?.some(a => a.code === form.origin) || !airports.some(a => a.code === form.destination)) { setInvalid('route'); setValidation('Vui lòng chọn điểm đi và điểm đến từ danh sách sân bay.'); return; }
    if (form.date < dayAfter(0)) { setInvalid('date'); setValidation('Vui lòng chọn ngày khởi hành từ hôm nay trở đi.'); return; }
    if (round && (!form.returnDate || form.returnDate < form.date)) { setInvalid('returnDate'); setValidation('Ngày về phải từ ngày đi trở đi.'); return; }
    const input = { ...form, returnDate: round ? form.returnDate : undefined };
    setSubmitting(true);
    try {
      if (onSearch) await onSearch(input);
      else {
        const params = new URLSearchParams();
        Object.entries(input).forEach(([key, value]) => { if (value) params.set(key, value); });
        navigate('/flights?' + params);
      }
    } finally { setSubmitting(false); }
  }
  function swap() { setForm({ ...form, origin: form.destination, destination: form.origin }); setSwapCount(v => v + 1); }
  return <form ref={formRoot} className={`search-form ${compact ? 'compact' : ''} ${round ? 'is-round-trip' : ''}`} onSubmit={submit} aria-label="Tìm kiếm chuyến bay" aria-busy={locked}>
    <div className="search-top"><div className="trip-switch" role="group" aria-label="Loại hành trình"><button type="button" aria-pressed={!round} className={!round ? 'selected' : ''} onClick={() => setRound(false)}><span className="radio-dot" />Một chiều</button><button type="button" aria-pressed={round} className={round ? 'selected' : ''} onClick={() => setRound(true)}><span className="radio-dot" />Khứ hồi</button></div><span className="search-assurance"><Icon name="shield" /> Hành trình của bạn, lựa chọn của bạn</span></div>
    <div className="search-fields">
      <div className="airport-pair"><AirportCombobox label="Điểm đi" value={form.origin} airports={airports ?? []} invalid={invalid === 'route'} errorId={errorId} disabled={loading || locked} onChange={origin => setForm({ ...form, origin })} /><button className="swap" type="button" aria-label="Đổi điểm đi và điểm đến" onClick={swap} disabled={locked} style={{ transform: `translate(-50%, -50%) rotate(${swapCount * 180}deg)` }}><Icon name="swap" /></button><AirportCombobox label="Điểm đến" value={form.destination} airports={airports ?? []} invalid={invalid === 'route'} errorId={errorId} disabled={loading || locked} onChange={destination => setForm({ ...form, destination })} /></div>
      <div className="date-fields"><label className="search-date"><span><Icon name="calendar" />Ngày đi</span><input aria-label="Ngày đi" aria-invalid={invalid === 'date' || undefined} aria-describedby={invalid === 'date' ? errorId : undefined} required type="date" min={dayAfter(0)} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={locked} /><small>Ngày khởi hành</small></label>{round && <label className="search-date"><span><Icon name="calendar" />Ngày về</span><input aria-label="Ngày về" aria-invalid={invalid === 'returnDate' || undefined} aria-describedby={invalid === 'returnDate' ? errorId : undefined} required type="date" min={form.date} value={form.returnDate ?? dayAfter(4)} onChange={e => setForm({ ...form, returnDate: e.target.value })} disabled={locked} /><small>Hành trình trở về</small></label>}</div>
      <div className="traveler-field" ref={travelerPanel} onKeyDown={e => { if (e.key === 'Escape') { setTravelersOpen(false); travelerPanel.current?.querySelector<HTMLButtonElement>('.traveler-trigger')?.focus(); } }}><span className="field-caption"><Icon name="users" />Hành khách & hạng vé</span><button type="button" className="traveler-trigger" aria-expanded={travelersOpen} aria-controls={travelersOpen ? travelerId : undefined} onClick={() => setTravelersOpen(!travelersOpen)} disabled={locked}><strong>{form.passengers} hành khách</strong><Icon name="chevron" /></button><small>{cabinName(form.cabinClass)}</small>{travelersOpen && <div id={travelerId} className="traveler-menu"><div className="passenger-counter"><div><strong>Số hành khách</strong><small>Tối đa 9 hành khách mỗi đơn</small></div><div className="stepper"><button type="button" aria-label="Giảm số hành khách" disabled={+form.passengers <= 1} onClick={() => setForm({ ...form, passengers: String(+form.passengers - 1) })}>−</button><output aria-label="Số hành khách" aria-live="polite">{form.passengers}</output><button type="button" aria-label="Tăng số hành khách" disabled={+form.passengers >= 9} onClick={() => setForm({ ...form, passengers: String(+form.passengers + 1) })}>+</button></div></div><label>Hạng vé<select aria-label="Hạng vé" value={form.cabinClass} onChange={e => setForm({ ...form, cabinClass: e.target.value })}><option value="ECONOMY">Phổ thông</option><option value="PREMIUM">Phổ thông đặc biệt</option><option value="BUSINESS">Thương gia</option></select></label><button className="button small full" type="button" onClick={() => { setTravelersOpen(false); travelerPanel.current?.querySelector<HTMLButtonElement>('.traveler-trigger')?.focus(); }}>Hoàn tất <Icon name="check" /></button></div>}</div>
      <button className="button search-button" type="submit" disabled={locked || !airports?.length}>{locked ? <span className="spinner" /> : <Icon name="search" />}<span>{locked ? 'Đang tìm…' : 'Tìm chuyến bay'}</span></button>
    </div>
    {!loading && airports && !airports.length && <Alert>Chưa có sân bay trong hệ thống. Tìm kiếm sẽ khả dụng khi có danh mục sân bay.</Alert>}
    {(error || validation) && <Alert id={errorId}>{validation || error}{error && <button className="text-button" type="button" onClick={retry}>Tải lại sân bay</button>}</Alert>}
  </form>;
}
