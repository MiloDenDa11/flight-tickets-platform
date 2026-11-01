import { useEffect, useRef, useState } from 'react';
import { Airport } from '../types';
import { SearchForm } from '../components/SearchForm';
import { Alert, Empty, Spinner, useResource } from '../components/common';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import Hero from '../components/home/Hero';
import Destinations from '../components/home/Destinations';
import AirlineDirectory from '../components/home/AirlineDirectory';
import FlightHighlights from '../components/home/FlightHighlights';
import { ClosingCTA, FAQ, JourneyGuide, WhyChoose } from '../components/home/JourneyGuide';
import WorldMapLoader from '../components/home/WorldMapLoader';
import CultureStories from '../components/home/CultureStories';

export default function HomePage() {
  const { data: airports, error, retry } = useResource<Airport[]>('/airports');
  const [selection, setSelection] = useState({ origin: 'SGN', destination: 'HAN' });
  const [mapReady, setMapReady] = useState(false);
  const mapSection = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mapSection.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setMapReady(true); observer.disconnect(); }
    }, { rootMargin: '400px' });
    observer.observe(mapSection.current);
    return () => observer.disconnect();
  }, []);
  function useRoute(origin: string, destination: string) {
    setSelection({ origin, destination });
    document.getElementById('flight-search')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <>
    <Hero />
    <section className="container search-floating" id="flight-search" aria-label="Tìm chuyến bay của bạn"><SearchForm initial={selection} /><div className="search-benefits"><span><Icon name="check" />Giá minh bạch, gồm thuế & phí</span><span><Icon name="check" />Lựa chọn hạng vé phù hợp</span><span><Icon name="check" />Quản lý hành trình trong một nơi</span><span className="demo-label"><span className="live-dot" /> Môi trường demo</span></div></section>
    <Destinations />
    <FlightHighlights />
    <CultureStories />
    <section className="world-section" id="world-map" ref={mapSection}><div className="container section"><Reveal><div className="section-heading"><div><span className="eyebrow">A WORLD OF POSSIBILITIES</span><h2>Thế giới rộng lớn.<br />Hành trình là của bạn.</h2></div><p>Khám phá bản đồ sân bay. Chọn hai điểm và biến một ý tưởng thành hành trình tiếp theo.</p></div></Reveal>{error ? <Alert>{error}<button className="text-button" onClick={retry}>Tải lại sân bay</button></Alert> : airports && !airports.length ? <Empty>Chưa có sân bay trong dữ liệu hệ thống để hiển thị trên bản đồ.</Empty> : airports?.length && mapReady ? <WorldMapLoader airports={airports} onUseRoute={useRoute} /> : <div className="map-placeholder"><Spinner /></div>}</div></section>
    <AirlineDirectory />
    <WhyChoose />
    <JourneyGuide />
    <FAQ />
    <ClosingCTA />
  </>;
}
