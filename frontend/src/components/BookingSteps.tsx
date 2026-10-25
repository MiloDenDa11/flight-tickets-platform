import Icon from './Icon';
export default function BookingSteps({ current }: { current: number }) {
  return <nav className="booking-steps" aria-label="Các bước đặt vé">{['Chọn chuyến bay','Thông tin hành khách','Thanh toán & vé'].map((label,index) => <div key={label} aria-current={index + 1 === current ? 'step' : undefined} className={index + 1 === current ? 'is-current' : index + 1 < current ? 'is-complete' : ''}><span>{index + 1 < current ? <Icon name="check" /> : index + 1}</span>{label}</div>)}</nav>;
}
