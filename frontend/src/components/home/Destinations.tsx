import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Airport } from '../../types';
import { dayAfter } from '../../utils/format';
import Icon from '../Icon';
import Reveal from '../Reveal';
import { Alert, useResource } from '../common';
import TravelImage from '../TravelImage';
const destinations = [
  { city: 'Hà Nội', code: 'HAN', country: 'Việt Nam', group: 'VN', image: '/images/ho-hoan-kiem.webp', tag: 'DẤU ẤN NGÀN NĂM', detail: 'Một buổi sớm bên hồ, một chiều chậm giữa những con phố cũ.' },
  { city: 'Đà Nẵng', code: 'DAD', country: 'Việt Nam', group: 'VN', image: '/images/my-khe.webp', tag: 'HẸN VỚI BIỂN XANH', detail: 'Đón nắng, nghe biển và tận hưởng chút thảnh thơi.' },
  { city: 'Đà Lạt', code: 'DLI', country: 'Việt Nam', group: 'VN', image: '/images/da-lat.webp', tag: 'BÌNH YÊN GIỮA MÂY', detail: 'Chậm lại giữa những triền thông và làn sương.' },
  { city: 'Singapore', code: 'SIN', country: 'Singapore', group: 'SEA', image: '/images/premium/singapore.jpg', tag: 'THÀNH PHỐ CỦA CẢM HỨNG', detail: 'Những khu vườn xanh, kiến trúc mới và một nhịp sống đầy năng lượng.' },
  { city: 'Bangkok', code: 'BKK', country: 'Thái Lan', group: 'SEA', image: '/images/premium/bangkok.jpg', tag: 'NHỊP ĐIỆU ĐÔ THỊ', detail: 'Khám phá những sắc màu, hương vị và góc nhìn mới giữa lòng Bangkok.' },
  { city: 'Tokyo', code: 'NRT', country: 'Nhật Bản', group: 'EA', image: '/images/premium/tokyo.jpg', tag: 'MỘT THẾ GIỚI KHÁC', detail: 'Khi những điều truyền thống gặp gỡ một thành phố luôn chuyển động.' },
  { city: 'Seoul', code: 'ICN', country: 'Hàn Quốc', group: 'EA', image: '/images/premium/seoul.jpg', tag: 'CŨ VÀ MỚI, THẬT GẦN', detail: 'Đi qua những cung điện yên bình, tìm nhịp sống mới bên dòng sông Hàn.' },
  { city: 'Paris', code: 'CDG', country: 'Pháp', group: 'EU', image: '/images/premium/paris.jpg', tag: 'CẢM HỨNG KHÔNG BIÊN GIỚI', detail: 'Dành một ngày cho nghệ thuật, những góc phố và cảm hứng mới.' },
  { city: 'London', code: 'LHR', country: 'Anh', group: 'EU', image: '/images/premium/london.jpg', tag: 'MỖI GÓC PHỐ, MỘT CÂU CHUYỆN', detail: 'Từ những công trình lịch sử đến một thành phố đa văn hóa bên sông Thames.' },
  { city: 'Dubai', code: 'DXB', country: 'UAE', group: 'OTHER', image: '/images/premium/dubai.jpg', tag: 'CHÂN TRỜI RỘNG MỞ', detail: 'Những đường nét tương lai, ánh nắng vùng Vịnh và một góc nhìn mới.' },
];
export default function Destinations() {
  const { data: airports, error, loading } = useResource<Airport[]>('/airports');
  const [group, setGroup] = useState('VN');
  const visible = destinations.filter(d => d.group === group);
  return <section className="container section destinations-section" id="destinations"><Reveal><div className="section-heading"><div><span className="eyebrow">COLLECT MOMENTS, NOT THINGS</span><h2>Một điểm đến.<br className="mobile-break" /> Vạn điều để nhớ.</h2><p>Mỗi nơi chốn là một câu chuyện đang chờ bạn viết tiếp.</p></div><div className="pill-tabs" role="group" aria-label="Khu vực điểm đến">{[['VN','Việt Nam'],['SEA','Đông Nam Á'],['EA','Đông Á'],['EU','Châu Âu'],['OTHER','Quốc tế khác']].map(([key,label]) => <button key={key} className={group === key ? 'active' : ''} aria-pressed={group === key} onClick={() => setGroup(key)}>{label}</button>)}</div></div></Reveal>
    <div className={`destination-grid count-${visible.length}`}>{visible.map((d, index) => {
      const origin = airports?.find(a => a.code === (d.code === 'SGN' ? 'HAN' : 'SGN'));
      const exists = origin && airports?.some(a => a.code === d.code);
      return <Reveal key={d.code} delay={index * 65}><article className="destination-card"><div className="destination-image"><TravelImage src={d.image} alt={`${d.city}, ${d.country}`} loading="lazy" width="700" height="850" /><span className="destination-country"><Icon name="pin" />{d.country}</span><span className="destination-code">{d.code}</span><div className="destination-overlay"><small>{d.tag}</small><h3>{d.city}</h3><p>{d.detail}</p>{exists ? <Link className="destination-cta" aria-label={`Tìm chuyến bay từ ${origin.city} đến ${d.city}`} to={`/flights?origin=${origin.code}&destination=${d.code}&date=${dayAfter()}&passengers=1&cabinClass=ECONOMY`}>Tìm chuyến bay <span><Icon name="northeast" /></span></Link> : <div className="inspiration-status"><Icon name="globe" /><span>Cảm hứng du lịch<br /><small>{loading ? 'Đang kiểm tra sân bay…' : error ? 'Chưa xác định được tình trạng sân bay' : 'Chưa có đường bay tương ứng trong danh mục sân bay'}</small></span></div>}</div></div></article></Reveal>;
    })}</div>{error && <Alert>{error} Thông tin điểm đến mang tính biên tập; tìm chuyến sẽ khả dụng khi tải được danh mục sân bay.</Alert>}
    <p className="editorial-note"><Icon name="info" />Ảnh và nội dung giới thiệu điểm đến. Giá, lịch bay và tình trạng ghế chỉ hiển thị khi có dữ liệu từ API.</p>
  </section>;
}
