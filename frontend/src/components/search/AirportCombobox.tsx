import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { Airport } from '../../types';
import { normalizeSearch } from '../../utils/search';
import Icon from '../Icon';

interface Props { label: string; value: string; airports: Airport[]; disabled?: boolean; invalid?: boolean; errorId?: string; onChange: (code: string) => void }
export default function AirportCombobox({ label, value, airports, disabled, invalid, errorId, onChange }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const selected = airports.find(a => a.code === value);
  const matches = airports.filter(a => normalizeSearch(`${a.city} ${a.code} ${a.name} ${a.country}`).includes(normalizeSearch(query)));
  const shown = open ? query : selected ? `${selected.city} (${selected.code})` : value;
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  function pick(airport: Airport) { onChange(airport.code); setOpen(false); setQuery(''); }
  function key(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActive(v => Math.max(0, Math.min(matches.length - 1, v + (event.key === 'ArrowDown' ? 1 : -1))));
    }
    if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[active]) pick(matches[active]); }
    if (event.key === 'Tab') setOpen(false);
  }
  return <div className="airport-field" ref={root}>
    <label htmlFor={id}><Icon name="pin" />{label}</label>
    <div className="airport-input"><input id={id} role="combobox" aria-label={label} aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined} aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-autocomplete="list" aria-activedescendant={open && matches.length ? `${id}-option-${active}` : undefined} autoComplete="off" value={shown} disabled={disabled} placeholder="Thành phố hoặc mã sân bay" onFocus={() => { setOpen(true); setQuery(''); setActive(0); }} onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true); }} onKeyDown={key} />{selected && !open && <span className="selected-airport-code" aria-hidden="true">{selected.code}</span>}<Icon name="chevron" /></div>
    <small>{selected?.name ?? (disabled ? 'Đang tải sân bay…' : 'Chọn sân bay từ danh sách')}</small>
    {open && <div className="airport-menu"><div className="airport-menu-heading"><Icon name="search" /> Tìm thành phố, sân bay hoặc mã IATA</div><ul role="listbox" id={`${id}-list`} aria-label={`Danh sách ${label.toLowerCase()}`}>{matches.length ? matches.map((a, i) => <li key={a.id} id={`${id}-option-${i}`} role="option" aria-selected={a.code === value} className={active === i ? 'is-active' : ''} onPointerMove={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(a)}><span className="airport-code">{a.code}</span><div><strong>{a.city}</strong><small>{a.name} · {a.country}</small></div>{a.code === value && <Icon name="check" />}</li>) : <li className="airport-no-results" role="option" aria-selected={false}>Không tìm thấy sân bay phù hợp.</li>}</ul></div>}
  </div>;
}
