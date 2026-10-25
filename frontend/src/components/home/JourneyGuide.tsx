import { Link } from 'react-router-dom';
import Icon from '../Icon';
import Reveal from '../Reveal';
export function WhyChoose() {
  const features = [
    ['globe', 'Chọn theo cách của bạn', 'Lọc hãng bay, khoảng giá và giờ khởi hành để tìm hành trình phù hợp với lịch trình.'],
    ['bag', 'Rõ ràng trước khi đặt', 'Xem giá trọn gói, hành lý và điều kiện hoàn của từng hạng vé trước khi quyết định.'],
    ['ticket', 'Hành trình trong tầm tay', 'Lưu tuyến yêu thích, theo dõi giữ chỗ và xem vé trong tài khoản cá nhân.'],
  ] as const;
  return <section className="why-section"><div className="container section"><Reveal><div className="why-heading"><span className="eyebrow light">THOUGHTFULLY CONNECTED</span><h2>Mỗi chi tiết nhỏ.<br /><span>Cho một hành trình lớn.</span></h2><p>Không chỉ là chọn một chuyến bay. Đó là cảm giác chủ động, từ lúc tìm kiếm đến khi sẵn sàng cất cánh.</p></div></Reveal><div className="why-grid">{features.map(([icon,title,description],i) => <Reveal key={icon} delay={i*80}><article className={`why-card why-${i}`}><span className="why-icon"><Icon name={icon} /></span><h3>{title}</h3><p>{description}</p></article></Reveal>)}</div></div></section>;
}
export function JourneyGuide() {
  return <section className="journey-guide"><div className="container section"><Reveal><div className="section-heading"><div><span className="eyebrow">LESS PLANNING, MORE LIVING</span><h2>Để mỗi chuyến đi<br />bắt đầu thật nhẹ nhàng.</h2></div><p>Từ ý tưởng đầu tiên đến khi nhận vé, những điều bạn cần được kết nối trong một trải nghiệm.</p></div></Reveal><div className="guide-grid">{([
    ['search','01','Tìm một hành trình','So sánh giá trọn gói, giờ bay và hãng hàng không từ dữ liệu hệ thống.'],
    ['ticket','02','Chọn điều phù hợp','Kiểm tra hành lý, điều kiện hạng vé và nhập thông tin hành khách.'],
    ['shield','03','Chủ động từng bước','Theo dõi giữ chỗ, thanh toán mô phỏng và quản lý vé ngay trong tài khoản.'],
  ] as const).map(([icon,index,title,description],i) => <Reveal key={index} delay={i * 80}><div className="guide-card"><div><span className="guide-icon"><Icon name={icon} /></span><span className="guide-index">{index}</span></div><h3>{title}</h3><p>{description}</p></div></Reveal>)}</div><Reveal><div className="personalized-banner"><span className="personalized-icon"><Icon name="spark" /></span><div><h3>Một gợi ý dành riêng cho bạn.</h3><p>Ưu tiên giá, thời gian hay hãng bay yêu thích? Hãy để sở thích dẫn lối.</p></div><Link className="button ghost" to="/assistant">Khám phá gợi ý <Icon name="northeast" /></Link></div></Reveal></div></section>;
}
export function FAQ() {
  const questions = [
    ['Giá vé hiển thị đã bao gồm những khoản nào?', 'Giá trong kết quả tìm kiếm là giá gốc cộng thuế và phí do API cung cấp, tính cho mỗi hành khách. Trang đặt vé trình bày tổng số tiền cho tất cả hành khách và các chặng bạn đã chọn.'],
    ['Tôi có thể đặt vé khứ hồi như thế nào?', 'Chọn “Khứ hồi”, nhập ngày đi và ngày về. Bạn sẽ chọn chuyến đi trước, sau đó chọn chuyến về. Thời gian và điều kiện các chuyến được hệ thống kiểm tra lại khi giữ chỗ.'],
    ['Chỗ của tôi được giữ trong bao lâu?', 'Trang chi tiết đơn hiển thị thời hạn giữ chỗ và bộ đếm thời gian. Khi hết hạn mà chưa thanh toán, đơn chuyển sang hết hạn và các ghế được trả lại.'],
    ['Tôi có thể hủy hoặc hoàn vé không?', 'Điều kiện hoàn được hiển thị theo hạng vé trước khi đặt và được lưu trên đơn. Đơn chưa thanh toán có thể hủy. Với đơn đã thanh toán, toàn bộ chặng cần được phép hoàn và chưa khởi hành.'],
    ['Đây có phải hệ thống phát hành vé máy bay thật không?', 'Đây là môi trường demo. Lịch bay, thanh toán và mã vé dùng cho trải nghiệm hệ thống; không có tiền thật được thu và vé không sử dụng để làm thủ tục tại sân bay.'],
  ];
  return <section className="container section faq-section" id="faq"><Reveal><div className="faq-layout"><div><span className="eyebrow">GOOD TO KNOW BEFORE YOU GO</span><h2>Một chút thông tin.<br />Thêm nhiều an tâm.</h2><p>Những điều hữu ích trước khi bạn chọn hành trình tiếp theo.</p><Link className="arrow-link" to="/bookings">Quản lý đặt chỗ <span><Icon name="northeast" /></span></Link></div><div className="faq-list">{questions.map(([question,answer]) => <details key={question}><summary>{question}<Icon name="chevron" /></summary><p>{answer}</p></details>)}</div></div></Reveal></section>;
}
export function ClosingCTA() {
  return <section className="container closing-cta"><div><span className="eyebrow light">EVERY JOURNEY, A NEW STORY</span><h2>Thế giới vẫn đang ở đó.<br /><span>Bạn đã sẵn sàng chưa?</span></h2><a className="button gold" href="#flight-search">Bắt đầu hành trình <Icon name="northeast" /></a></div><div className="closing-orbit" aria-hidden="true"><div /><div /><Icon name="globe" /></div><span className="closing-caption">LET YOUR NEXT CHAPTER TAKE FLIGHT.</span></section>;
}
