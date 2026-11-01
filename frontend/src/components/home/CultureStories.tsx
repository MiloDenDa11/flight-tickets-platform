import { useState } from 'react';
import Icon from '../Icon';
import Reveal from '../Reveal';
import TravelImage from '../TravelImage';

const stories = [
  { city: 'Hà Nội', country: 'Việt Nam', label: 'Một nhịp sống chậm', title: 'Đi thật xa.\nĐể thấy thật gần.', image: '/images/ho-hoan-kiem.webp', alt: 'Hồ Hoàn Kiếm giữa lòng Hà Nội', intro: 'Có những nơi ta nhớ bằng một hương vị, một câu chào, hay một buổi sáng chẳng cần vội.', body: 'Dạo quanh hồ Hoàn Kiếm, ghé một quán cà phê nhỏ rồi đi bộ qua những con phố cũ. Đôi khi, điều đáng nhớ nhất của chuyến đi nằm giữa những điểm đến trên bản đồ.', detail: 'Gợi ý trải nghiệm: đi bộ, cà phê và khám phá phố cổ.' },
  { city: 'Tokyo', country: 'Nhật Bản', label: 'Giữa cũ và mới', title: 'Một thành phố.\nNhiều thế giới nhỏ.', image: '/images/premium/tokyo.jpg', alt: 'Khung cảnh đô thị Tokyo, Nhật Bản', intro: 'Để sự tò mò dẫn lối, từ một con phố náo nhiệt đến một góc nhỏ bình yên.', body: 'Dành thời gian khám phá những khu phố có cá tính riêng, thử một bữa ăn địa phương và cảm nhận cách truyền thống hiện diện trong đời sống thành thị. Một hành trình thú vị không nhất thiết phải kín lịch.', detail: 'Gợi ý trải nghiệm: kiến trúc, ẩm thực và những khu phố.' },
  { city: 'Seoul', country: 'Hàn Quốc', label: 'Những góc nhìn khác', title: 'Chạm một nơi.\nHiểu thêm một chút.', image: '/images/premium/seoul.jpg', alt: 'Khung cảnh thành phố Seoul, Hàn Quốc', intro: 'Mỗi thành phố có một nhịp điệu. Hãy dành cho mình thời gian để lắng nghe.', body: 'Kết hợp một buổi khám phá kiến trúc truyền thống với một chiều dạo phố và thưởng thức món ăn địa phương. Những đối lập nho nhỏ làm nên một Seoul luôn có điều mới để tìm thấy.', detail: 'Gợi ý trải nghiệm: văn hóa, dạo phố và món ăn địa phương.' },
];

export default function CultureStories() {
  const [active, setActive] = useState(0);
  const story = stories[active];
  return <section id="cultures" className="culture-section" aria-labelledby="culture-title"><div className="container section">
    <Reveal><div className="section-heading"><div><span className="eyebrow">NHỮNG ĐIỀU LÀM NÊN MỘT CHUYẾN ĐI</span><h2 id="culture-title">Không chỉ đến.<br /><em>Mà còn cảm nhận.</em></h2></div><p>Một chút văn hóa, một nhịp sống mới.<br />Khám phá thế giới trước khi bạn cất cánh.</p></div></Reveal>
    <div className="culture-tabs" role="tablist" aria-label="Câu chuyện văn hóa">{stories.map((item, index) => <button key={item.city} type="button" role="tab" id={`culture-tab-${index}`} aria-controls="culture-story" aria-selected={index === active} tabIndex={index === active ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (active + 1) % stories.length : event.key === 'ArrowLeft' ? (active + stories.length - 1) % stories.length : event.key === 'Home' ? 0 : event.key === 'End' ? stories.length - 1 : null; if (next !== null) { event.preventDefault(); setActive(next); document.getElementById(`culture-tab-${next}`)?.focus(); } }}><span>0{index + 1}</span>{item.city}<Icon name="northeast" /></button>)}</div>
    <div className="culture-story" role="tabpanel" id="culture-story" aria-labelledby={`culture-tab-${active}`} tabIndex={0}>
      <div className="culture-photo"><TravelImage key={story.image} src={story.image} width="900" height="720" loading="lazy" alt={story.alt} /><span><Icon name="pin" />{story.city}, {story.country}</span></div>
      <article className="culture-copy"><span className="culture-index">0{active + 1} / 03</span><span className="eyebrow">{story.label}</span><h3>{story.title.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h3><p className="culture-intro">{story.intro}</p><p>{story.body}</p><div className="culture-tip"><Icon name="spark" /><span>{story.detail}</span></div><a className="arrow-link" href="#destinations">Khám phá điểm đến <span><Icon name="northeast" /></span></a></article>
    </div><p className="editorial-note">Cảm hứng du lịch biên tập · Không phải tour hoặc dịch vụ đang mở bán.</p>
  </div></section>;
}
