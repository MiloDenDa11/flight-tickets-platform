import { useEffect, useState } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Polyline, Tooltip, useMap } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import { CRS, type LatLngExpression } from 'leaflet';
import { Airport } from '../../types';
import { mapInspiration } from '../../data/mapInspiration';
import { Alert, Spinner } from '../common';
import Icon from '../Icon';
import 'leaflet/dist/leaflet.css';

function curved(from: Pick<Airport, 'latitude' | 'longitude'>, to: Pick<Airport, 'latitude' | 'longitude'>): LatLngExpression[] {
  const distance = Math.hypot(+to.latitude - +from.latitude, +to.longitude - +from.longitude);
  return Array.from({ length: 45 }, (_, i) => {
    const t = i / 44;
    return [+from.latitude + (+to.latitude - +from.latitude) * t + Math.sin(t * Math.PI) * Math.min(9, distance * .22), +from.longitude + (+to.longitude - +from.longitude) * t] as [number, number];
  });
}
function ViewControl({ view, airports }: { view: { mode: string; revision: number }; airports: Airport[] }) {
  const map = useMap();
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (view.mode === 'airports' && airports.length) map.fitBounds(airports.map(a => [+a.latitude, +a.longitude] as [number, number]), { padding: [55, 55], maxZoom: 4, animate: !reduced });
    else map.fitBounds([[-55,-180],[82,180]], { padding: [24, 70], animate: !reduced });
  }, [map, view, airports]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (view.mode === 'world') map.fitBounds([[-55,-180],[82,180]], { padding: [24, 70], animate: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, view.mode]);
  return null;
}
export default function WorldMap({ airports, onUseRoute }: { airports: Airport[]; onUseRoute: (origin: string, destination: string) => void }) {
  const [geometry, setGeometry] = useState<GeoJsonObject | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [originCode, setOrigin] = useState('SGN'), [destinationCode, setDestination] = useState('SIN');
  const [view, setView] = useState(() => ({ mode: window.matchMedia('(max-width: 767px)').matches ? 'airports' : 'world', revision: 0 }));
  const valid = airports.filter(a => Number.isFinite(+a.latitude) && Number.isFinite(+a.longitude));
  const origin = valid.find(a => a.code === originCode) ?? valid[0];
  const destination = valid.find(a => a.code === destinationCode && a.id !== origin?.id) ?? valid.find(a => a.id !== origin?.id);
  useEffect(() => {
    const controller = new AbortController(); setError('');
    fetch('/geo/world-land.geojson', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setGeometry).catch(e => { if (e.name !== 'AbortError') setError('Chưa tải được bản đồ. Bạn vẫn có thể chọn sân bay bên cạnh.'); });
    return () => controller.abort();
  }, [retry]);
  return <div className="world-map-shell">
    <div className="map-canvas" role="region" aria-label="Bản đồ thế giới tương tác, đường nối minh họa giữa các sân bay">
      <div className="map-overlay-title"><span className="live-dot" /> EXPLORE YOUR NEXT HORIZON</div>
      {geometry ? <MapContainer crs={CRS.EPSG4326} center={[18,45]} zoom={1} zoomSnap={.25} minZoom={-1.5} maxZoom={6} scrollWheelZoom={false} zoomControl preferCanvas={false} className="world-leaflet" maxBounds={[[-90,-220],[90,220]]}>
        <GeoJSON data={geometry} style={{ color: '#387385', weight: .65, fillColor: '#1d5264', fillOpacity: .95 }} attribution='<a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth · Public domain</a>' />
        {origin && mapInspiration.map(city => <Polyline key={`inspiration-${city.id}`} positions={curved(origin,city)} interactive={false} pathOptions={{ color: '#69c8f0', weight: 1.2, opacity: .35, dashArray: '3 8' }} />)}
        {mapInspiration.map(city => <CircleMarker key={city.id} className="map-inspiration-marker" center={[city.latitude,city.longitude]} radius={3.5} pathOptions={{ color: '#f0b86d', weight: 1.2, fillColor: '#0b2635', fillOpacity: 1 }}><Tooltip direction="top" className="airport-tooltip"><strong>{city.city}</strong><br />Thành phố minh họa · Không phải dữ liệu mở bán</Tooltip></CircleMarker>)}
        {origin && valid.filter(a => a.id !== origin.id).map(a => <Polyline key={`${origin.id}-${a.id}-${a.id === destination?.id}`} className={a.id === destination?.id ? 'map-flight-arc' : ''} positions={curved(origin,a)} pathOptions={{ color: a.id === destination?.id ? '#e8b875' : '#3b8190', weight: a.id === destination?.id ? 2.3 : 1, opacity: a.id === destination?.id ? .95 : .45, dashArray: a.id === destination?.id ? '8 7' : '3 7' }} />)}
        {valid.map(a => <CircleMarker key={`${a.id}-${a.id === destination?.id}`} className={a.id === destination?.id ? 'map-selected-marker' : ''} center={[+a.latitude,+a.longitude]} radius={a.id === destination?.id ? 7 : a.id === origin?.id ? 6 : 4} pathOptions={{ color: '#fff', weight: 1.5, fillColor: a.id === destination?.id ? '#e8b875' : '#45c1bf', fillOpacity: 1 }} eventHandlers={{ click: () => { if (a.id !== origin?.id) setDestination(a.code); } }}><Tooltip direction="top" className="airport-tooltip"><strong>{a.city} · {a.code}</strong><br />{a.name}</Tooltip></CircleMarker>)}
        <ViewControl view={view} airports={airports} />
      </MapContainer> : error ? <div className="map-load-error"><Alert>{error}</Alert><button className="button small" onClick={() => setRetry(v => v+1)}>Tải lại bản đồ</button></div> : <Spinner />}
      <div className="map-view-controls"><button aria-pressed={view.mode === 'world'} onClick={() => setView(v => ({ mode: 'world', revision: v.revision+1 }))}><Icon name="globe" />Thế giới</button><button aria-pressed={view.mode === 'airports'} onClick={() => setView(v => ({ mode: 'airports', revision: v.revision+1 }))}><Icon name="pin" />Khu vực sân bay</button></div>
      <div className="map-legend"><span><i />Sân bay từ API</span><span className="legend-city"><i />Thành phố minh họa</span><span className="legend-route"><i />Đường nối minh họa</span></div>
    </div>
    <aside className="map-route-card"><span className="eyebrow">THE WORLD IS CALLING</span><h3>Điểm đến tiếp theo<br />của bạn ở đâu?</h3><p>Chạm vào một sân bay trên bản đồ, hoặc chọn bên dưới để bắt đầu khám phá.</p><label>Khởi hành từ<select aria-label="Điểm đi trên bản đồ" value={origin?.code ?? ''} onChange={e => setOrigin(e.target.value)}>{valid.map(a => <option value={a.code} key={a.id}>{a.city} ({a.code})</option>)}</select></label><label>Điểm đến<select aria-label="Điểm đến trên bản đồ" value={destination?.code ?? ''} onChange={e => setDestination(e.target.value)}>{valid.filter(a => a.id !== origin?.id).map(a => <option value={a.code} key={a.id}>{a.city} ({a.code})</option>)}</select></label><div className="map-route-codes"><strong>{origin?.code ?? '—'}</strong><Icon name="arrow" /><strong>{destination?.code ?? '—'}</strong></div><button className="button full" disabled={!origin || !destination} onClick={() => { if (origin && destination) onUseRoute(origin.code,destination.code); }}>Dùng cho tìm kiếm<Icon name="northeast" /></button><small>Thành phố viền vàng và đường nối là minh họa. Chỉ sân bay từ API có thể dùng để tìm vé; lịch bay và tình trạng mở bán được xác định khi tìm kiếm.</small></aside>
  </div>;
}
