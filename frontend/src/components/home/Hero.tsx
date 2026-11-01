import Icon from '../Icon';
import GlobeExperience from './GlobeExperience';
import TravelImage from '../TravelImage';
export default function Hero() {
  return <section className="premium-hero" aria-labelledby="hero-heading">
    <TravelImage className="hero-image" src="/images/premium/hero-flight.jpg" alt="" loading="eager" fetchPriority="high" decoding="async" width="1672" height="941" />
    <div className="hero-shade" />
    <div className="container hero-inner">
      <div className="hero-copy"><span className="eyebrow light">KHÁM PHÁ KHÔNG GIỚI HẠN</span><h1 id="hero-heading">Thế giới rộng mở.<br /><span>Chạm một hành trình.</span></h1><p>Từ những nơi thân quen đến chân trời chưa từng đặt chân tới. Tìm chuyến bay phù hợp, viết tiếp câu chuyện của bạn.</p><div className="hero-actions"><a className="button gold" href="#flight-search">Tìm chuyến bay <Icon name="northeast" /></a><a className="hero-secondary" href="#destinations">Khơi nguồn cảm hứng <Icon name="arrow" /></a></div><div className="hero-caption"><span /> EXPLORE BEYOND BORDERS.</div></div>
      <GlobeExperience />
    </div>
  </section>;
}
