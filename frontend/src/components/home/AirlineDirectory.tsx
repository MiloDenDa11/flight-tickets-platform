import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Airline } from '../../types';
import { airlineReferences } from '../../data/airlines';
import { dayAfter } from '../../utils/format';
import AirlineMark from '../AirlineMark';
import Icon from '../Icon';
import Reveal from '../Reveal';
import { Alert, useResource } from '../common';
const airlineRegion=(country:string)=>!country||country==='Chưa cập nhật'?'UNKNOWN':['viet nam','vietnam','vn'].includes(country.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase())?'VN':'INT';

export default function AirlineDirectory() {
  const { data: available, error, retry } = useResource<Airline[]>('/airlines');
  const [region, setRegion] = useState('ALL'), [expanded, setExpanded] = useState(false);
  const managed=(available??[]).filter(a=>!airlineReferences.some(item=>item.code===a.code)).map(a=>({code:a.code,name:a.name,color:a.color,country:a.country??'Chưa cập nhật',website:a.website??'',region:airlineRegion(a.country??'')}));
  const references=[...airlineReferences.map(a=>{const item=available?.find(item=>item.code===a.code);if(!item)return a;const country=item.country&&item.country!=='Chưa cập nhật'?item.country:a.country;return {...a,name:item.name,color:item.color,country,region:airlineRegion(country),website:item.website??a.website};}),...managed];
  const filtered = references.filter(a => region === 'ALL' || a.region === region);
  const shown = expanded ? filtered : filtered.slice(0, 6);
  return <section className="airline-section" id="airlines"><div className="container section">
    <Reveal><div className="section-heading"><div><span className="eyebrow">THE WORLD, WELL CONNECTED</span><h2>Những hãng bay bạn yêu thích.</h2><p>Từ Việt Nam đến thế giới. Khám phá những thương hiệu hàng không cho hành trình tiếp theo.</p></div><div className="pill-tabs" role="group" aria-label="Khu vực hãng bay">{[['ALL','Tất cả'],['VN','Việt Nam'],['INT','Quốc tế']].map(([key,label]) => <button key={key} aria-pressed={region === key} className={region === key ? 'active' : ''} onClick={() => { setRegion(key); setExpanded(false); }}>{label}</button>)}</div></div></Reveal>
    <div className="airline-grid">{shown.map((a, index) => {
      const integrated = available?.find(item => item.code === a.code);
      const content = <><AirlineMark code={a.code} name={integrated?.name??a.name} color={integrated?.color??a.color} logoUrl={integrated?.logoUrl??undefined} large /><strong>{integrated?.name ?? a.name}</strong><small>{integrated?.country&&integrated.country!=='Chưa cập nhật'?integrated.country:a.country}</small><span className={integrated ? 'airline-action available' : 'airline-action'}>{integrated ? 'Tìm chuyến trong hệ thống' : 'Website chính thức'}<Icon name="northeast" /></span></>;
      return <Reveal key={a.code} delay={index % 6 * 35}>{integrated ? <Link className="airline-card" to={`/flights?origin=SGN&destination=HAN&date=${dayAfter()}&passengers=1&cabinClass=ECONOMY&airline=${a.code}`}>{content}</Link> : <a className="airline-card" href={a.website} target="_blank" rel="noreferrer">{content}</a>}</Reveal>;
    })}</div>
    {filtered.length > 6 && <div className="center-action"><button className="button ghost small" onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn danh sách' : `Khám phá ${filtered.length} hãng hàng không`}<Icon name="chevron" /></button></div>}
    {error && <Alert>{error}<button className="text-button" onClick={retry}>Tải lại danh sách hãng trong hệ thống</button></Alert>}
    <p className="editorial-note"><Icon name="info" />Danh mục giới thiệu thương hiệu, không phải danh sách đối tác tích hợp. Chỉ hãng có trong API mới có liên kết tìm chuyến trong hệ thống.</p>
  </div></section>;
}
