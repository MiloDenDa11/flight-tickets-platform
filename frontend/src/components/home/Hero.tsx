import Icon from '../Icon';
import { Plane } from '../common';
export default function Hero() {
  return <section className="premium-hero" aria-labelledby="hero-heading">
    <img className="hero-image" src="/images/premium/hero-flight.jpg" alt="Ảnh minh họa máy bay thương mại bay trên những tầng mây trong ánh bình minh" loading="eager" decoding="async" width="1672" height="941" />
    <div className="hero-shade" />
    <svg className="hero-routes" viewBox="0 0 1440 720" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="hero-route" x1="720" y1="580" x2="1350" y2="120"><stop stopColor="#69C8F0" stopOpacity="0" /><stop offset=".5" stopColor="#69C8F0" stopOpacity=".65" /><stop offset="1" stopColor="#F0B86D" stopOpacity=".8" /></linearGradient></defs>
      <path className="hero-route-path" d="M720 600 Q920 115 1300 150" stroke="url(#hero-route)" strokeWidth="1.2" strokeDasharray="6 9" />
      <path d="M830 590 Q1050 250 1410 330" stroke="url(#hero-route)" strokeWidth=".8" />
      <g className="hero-airport-label"><circle cx="1300" cy="150" r="4" fill="#F0B86D" /><circle cx="1300" cy="150" r="11" stroke="#F0B86D" strokeOpacity=".3" /><text x="1260" y="129">NRT</text><circle cx="1410" cy="330" r="3" fill="#69C8F0" /><text x="1368" y="312">SIN</text></g>
    </svg>
    <div className="container hero-inner">
      <div className="hero-copy"><span className="eyebrow light">YOUR NEXT JOURNEY STARTS HERE</span><h1 id="hero-heading">Chạm đến những<br /><span>chân trời mới.</span></h1><p>Có những câu chuyện chỉ bắt đầu khi bạn cất cánh.<br />{' '}Tìm chuyến bay phù hợp và đi theo cách của bạn.</p><div className="hero-actions"><a className="button gold" href="#flight-search">Tìm chuyến bay <Icon name="northeast" /></a><a className="hero-secondary" href="#world-map">Khám phá thế giới <Icon name="arrow" /></a></div><div className="hero-caption"><span /> A NEW PERSPECTIVE IS JUST A FLIGHT AWAY.</div></div>
      <div className="hero-boarding" aria-label="Thẻ hành trình minh họa"><div className="boarding-eyebrow"><Plane /><span>YOUR NEXT STORY</span><Icon name="northeast" /></div><div className="boarding-airports"><div><strong>SGN</strong><small>Hồ Chí Minh</small></div><div className="boarding-arc"><Plane /></div><div><strong>HAN</strong><small>Hà Nội</small></div></div><div className="boarding-caption"><span>MỘT HÀNH TRÌNH MỚI</span><span>READY TO EXPLORE</span></div><small className="boarding-disclaimer">Thẻ minh họa · Không phải vé máy bay</small></div>
    </div>
  </section>;
}
