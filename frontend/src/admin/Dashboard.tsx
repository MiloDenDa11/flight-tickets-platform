import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Airline } from "../types";
import AirlineMark from "../components/AirlineMark";
import { FilterUpdate, Overview, FareHistory } from "./types";
import { useAdminData, amount, stamp, flightLink } from "./useAdminData";
import {
  Badge,
  DataState,
  EmptyState,
  GroupToggle,
  Kpi,
  MiniLink,
  Notice,
  Panel,
  Status,
} from "./ui";
import { AirlineChart, LineChart } from "./Charts";
import AdminIcon from "./Icons";
export function NowLabel() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <time dateTime={now.toISOString()}>
      {new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now)}
    </time>
  );
}
export default function Dashboard({
  query,
  revision,
  update,
  airlines,
}: {
  query: string;
  revision: number;
  update: FilterUpdate;
  airlines: Airline[];
}) {
  const state = useAdminData<Overview>(
      "/admin/analytics/overview",
      query,
      revision,
      30000,
    ),
    params = new URLSearchParams(query);
  const d = state.data;
  const [airlineMode, setAirlineMode] = useState<"bar" | "donut">("bar");
  return (
    <>
      <section className="ad-hero">
        <div className="ad-hero-text">
          <span className="ad-eyebrow">
            <i /> TRUNG TÂM ĐIỀU HÀNH HÀNG KHÔNG
          </span>
          <h1>Tổng quan quản trị</h1>
          <p>
            Theo dõi lịch bay, giá vé và hoạt động kinh doanh.
          </p>
          <div className="ad-hero-meta">
            <span>
              <AdminIcon name="clock" />
              <NowLabel />
            </span>
            <Badge tone="glass">UTC +07:00</Badge>
          </div>
        </div>
        <div className="ad-hero-visual" aria-hidden="true">
          <div className="ad-radar" />
          <span className="ad-coordinate">10°49′08″N / 106°39′06″E</span>
          <span className="ad-hero-caption">YOUR SKY. YOUR CONTROL.</span>
        </div>
        <div className="ad-hero-footer">
          <span>
            <i
              className={"ad-status-dot " + (!d || state.error ? "amber" : "")}
            />
            {state.error
              ? "Đang kiểm tra kết nối"
              : d
                ? "Nguồn dữ liệu: PostgreSQL"
                : "Đang tải database…"}
          </span>
          <span>
            <AdminIcon name="refresh" />
            Lần tải: {stamp(state.updatedAt)} · tải lại mỗi 30 giây
          </span>
        </div>
      </section>
      <DataState {...state}>
        <>
          {d && (
            <>
              <div className="ad-section-label">
                <div>
                  <span className="ad-eyebrow">DỮ LIỆU TRONG KỲ</span>
                  <h2>Toàn cảnh vận hành</h2>
                </div>
                <span className="ad-muted">
                  Dữ liệu trong kỳ đang chọn · {d.report.currency}
                </span>
              </div>
              <div className="ad-kpi-grid">
                <Kpi
                  label="Thực thu thành công"
                  value={d.kpis.revenue}
                  icon="revenue"
                  accent="blue"
                  money
                  currency={d.report.currency}
                  delta={d.comparison.revenue}
                  hint="Chưa có kỳ trước để so sánh"
                  sparkline={d.report.series.map((s) => s.gross)}
                />
                <Kpi
                  label="Vé đã thanh toán"
                  value={d.kpis.tickets}
                  icon="bookings"
                  accent="teal"
                  delta={d.comparison.tickets}
                  hint="Số hành khách × chặng bay"
                  sparkline={d.report.series.map((s) => s.tickets)}
                />
                <Kpi
                  label="Chuyến bay trong kỳ"
                  value={d.kpis.flights}
                  icon="flights"
                  accent="violet"
                  hint="Theo ngày khởi hành"
                />
                <Kpi
                  label="Đơn đã xác nhận"
                  value={d.kpis.successful}
                  icon="check"
                  accent="green"
                  hint="Theo ngày tạo đơn"
                />
                <Kpi
                  label="Chờ thanh toán"
                  value={d.kpis.pending}
                  icon="clock"
                  accent="amber"
                  hint="Đơn đang giữ chỗ"
                />
                <Kpi
                  label="Đơn đã hủy"
                  value={d.kpis.cancelled}
                  icon="activity"
                  accent="coral"
                  hint={
                    "Đã hoàn: " +
                    amount(d.kpis.refunds, d.report.currency, true)
                  }
                />
                <Kpi
                  label="Giá vé bình quân"
                  value={d.kpis.averageFare}
                  icon="fares"
                  accent="cyan"
                  money
                  currency={d.report.currency}
                  hint="Thực thu / số chặng vé đã bán"
                />
                <Kpi
                  label="Hãng đang hoạt động"
                  value={d.kpis.activeAirlines}
                  icon="airlines"
                  accent="navy"
                  hint="Danh mục hãng trong hệ thống"
                />
              </div>
              <div className="ad-grid-main">
                <Panel
                  title="Nhịp tăng trưởng doanh thu"
                  subtitle="Khoản thu và khoản hoàn theo ngày giao dịch"
                  action={
                    <GroupToggle
                      value={params.get("group") ?? "DAY"}
                      update={update}
                    />
                  }
                >
                  <div className="ad-chart-summary">
                    <strong>{amount(d.report.gross, d.report.currency)}</strong>
                    <span>Thực thu trong kỳ</span>
                    <Badge tone="green">
                      Thuần: {amount(d.report.net, d.report.currency, true)}
                    </Badge>
                  </div>
                  <LineChart
                    hasObservations={
                      d.report.orders > 0 || d.report.refunds > 0
                    }
                    points={d.report.series}
                    metrics={[
                      { key: "gross", label: "Thực thu", color: "var(--ad-chart-blue)" },
                      { key: "refunds", label: "Hoàn tiền", color: "var(--ad-chart-amber)" },
                    ]}
                    currency={d.report.currency}
                  />
                  <p className="ad-chart-foot">
                    Thời gian Việt Nam · Không cộng đơn chờ hoặc chưa thanh
                    toán.
                  </p>
                </Panel>
                <Panel
                  title="Hiệu quả theo hãng"
                  subtitle="Doanh thu phân bổ theo giá từng chặng"
                  action={
                    <div className="ad-segment">
                      <button
                        className={airlineMode === "bar" ? "active" : ""}
                        aria-pressed={airlineMode === "bar"}
                        onClick={() => setAirlineMode("bar")}
                      >
                        Cột
                      </button>
                      <button
                        className={airlineMode === "donut" ? "active" : ""}
                        aria-pressed={airlineMode === "donut"}
                        onClick={() => setAirlineMode("donut")}
                      >
                        Tỷ trọng
                      </button>
                    </div>
                  }
                >
                  <AirlineChart
                    items={d.report.byAirline}
                    currency={d.report.currency}
                    mode={airlineMode}
                  />
                  <MiniLink to="/admin/revenue">Báo cáo chi tiết</MiniLink>
                </Panel>
              </div>
              <div className="ad-grid-main">
                <Panel
                  title="Bảng khởi hành"
                  subtitle="Các chuyến sắp tới trong kỳ theo bộ lọc"
                  action={
                    <MiniLink to="/admin/flights">Theo dõi chuyến bay</MiniLink>
                  }
                >
                  {d.upcoming.length ? (
                    <div className="ad-departure-board">
                      <div className="ad-board-labels">
                        <span>Chuyến bay / hành trình</span>
                        <span>Khởi hành</span>
                        <span>Khai thác</span>
                      </div>
                      {d.upcoming.map((f) => (
                        <Link
                          key={f.id}
                          to={flightLink(f)}
                          className="ad-departure-row"
                        >
                          <div className="ad-flight-brand">
                            <AirlineMark
                              code={f.airline.code}
                              name={f.airline.name}
                              color={f.airline.color}
                            />
                            <div>
                              <b>{f.flightNumber}</b>
                              <small>{f.airline.name}</small>
                            </div>
                          </div>
                          <div className="ad-board-route">
                            <b>
                              {f.origin.code}
                              <AdminIcon name="flights" />
                              {f.destination.code}
                            </b>
                            <small>
                              {f.origin.city} → {f.destination.city}
                            </small>
                          </div>
                          <div>
                            <b>{stamp(f.departureTime)}</b>
                            <small>Lịch công bố · VN</small>
                          </div>
                          <Status value={f.operationalStatus} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Chưa có chuyến sắp khởi hành" />
                  )}
                  <div className="ad-board-note">
                    <AdminIcon name="shield" />
                    Lịch công bố không xác nhận chuyến bay đúng giờ. Chỉ hiện
                    trạng thái khai thác khi có nguồn cung cấp.
                  </div>
                </Panel>
                <Panel
                  title="Mạng lưới hành trình"
                  subtitle="Phân bố chuyến bay theo lịch trong kỳ"
                >
                  {d.regions && d.kpis.flights > 0 && (
                    <div
                      className="ad-region-summary"
                      role="group"
                      aria-label="Phân bố chuyến bay theo khu vực"
                    >
                      <div className="ad-region-track" aria-hidden="true">
                        <i
                          style={{
                            width:
                              (d.regions.domestic / d.kpis.flights) * 100 + "%",
                          }}
                        />
                        <i
                          style={{
                            width:
                              (d.regions.international / d.kpis.flights) * 100 +
                              "%",
                          }}
                        />
                      </div>
                      <div>
                        <button
                          aria-pressed={params.get("region") === "DOMESTIC"}
                          onClick={() =>
                            update({
                              region:
                                params.get("region") === "DOMESTIC"
                                  ? "ALL"
                                  : "DOMESTIC",
                            })
                          }
                        >
                          <i />
                          <span>
                            Nội địa VN
                            <b>{d.regions.domestic.toLocaleString("vi-VN")}</b>
                          </span>
                        </button>
                        <button
                          aria-pressed={
                            params.get("region") === "INTERNATIONAL"
                          }
                          onClick={() =>
                            update({
                              region:
                                params.get("region") === "INTERNATIONAL"
                                  ? "ALL"
                                  : "INTERNATIONAL",
                            })
                          }
                        >
                          <i />
                          <span>
                            Quốc tế
                            <b>
                              {d.regions.international.toLocaleString("vi-VN")}
                            </b>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="ad-route-list">
                    {d.routes.length ? (
                      d.routes.slice(0, 5).map((r, i) => (
                        <button
                          key={r.origin.code + r.destination.code}
                          onClick={() =>
                            update({
                              origin: r.origin.code,
                              destination: r.destination.code,
                            })
                          }
                        >
                          <span className="ad-route-rank">0{i + 1}</span>
                          <div>
                            <b>
                              {r.origin.code}
                              <AdminIcon name="arrow" />
                              {r.destination.code}
                            </b>
                            <small>
                              {r.origin.city} → {r.destination.city}
                            </small>
                            <i>
                              <span
                                style={{
                                  width:
                                    Math.max(
                                      4,
                                      (r.count /
                                        Math.max(d.routes[0].count, 1)) *
                                        100,
                                    ) + "%",
                                }}
                              />
                            </i>
                          </div>
                          <strong>
                            {r.count}
                            <small>chuyến</small>
                          </strong>
                        </button>
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                  <p className="ad-chart-foot">
                    Chọn hành trình để lọc toàn bộ báo cáo.
                  </p>
                </Panel>
              </div>
              <div className="ad-grid-equal">
                <Panel
                  title="Vé đã thanh toán theo thời gian"
                  subtitle="Đếm từng hành khách trên từng chặng bay"
                >
                  <LineChart
                    points={d.report.series}
                    metrics={[
                      {
                        key: "tickets",
                        label: "Chặng vé đã bán",
                        color: "var(--ad-chart-teal)",
                      },
                    ]}
                    numeric
                    emptyMessage="Chưa có vé thanh toán thành công trong kỳ đang chọn."
                  />
                </Panel>
                <Panel
                  title="Hoạt động thanh toán gần đây"
                  subtitle="Chỉ hiển thị các giao dịch đã thực sự ghi nhận"
                  action={<MiniLink to="/admin/bookings">Đơn đặt vé</MiniLink>}
                >
                  {d.report.transactions.length ? (
                    <div className="ad-payment-feed">
                      {d.report.transactions.map((t) => (
                        <Link
                          to={"/admin/bookings?q=" + t.reference}
                          key={t.id}
                        >
                          <i>
                            <AdminIcon name="bookings" />
                          </i>
                          <div>
                            <b>{t.reference}</b>
                            <small>
                              {t.flightNumbers} · {stamp(t.paidAt)}
                            </small>
                          </div>
                          <div>
                            <strong>
                              {amount(t.gross, d.report.currency)}
                            </strong>
                            <Status value={t.status} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Chưa có giao dịch trong kỳ"
                      action={
                        <MiniLink to="/admin/bookings">
                          Kiểm tra đơn đặt vé
                        </MiniLink>
                      }
                    >
                      Giao dịch thành công sẽ tự động xuất hiện tại đây.
                    </EmptyState>
                  )}
                </Panel>
              </div>
              <PriceOverview query={query} revision={revision} />
              <Panel
                title="Airline workspace"
                subtitle="Danh mục hãng đang có trong hệ thống"
                action={
                  <MiniLink to="/admin/airlines">Quản lý hãng bay</MiniLink>
                }
              >
                <div className="ad-brand-strip">
                  {airlines.map((a) => (
                    <Link to={"/admin/flights?airlineId=" + a.id} key={a.id}>
                      <AirlineMark
                        code={a.code}
                        name={a.name}
                        color={a.color}
                      />
                      <div>
                        <strong>{a.name}</strong>
                        <small>
                          {a.code} ·{" "}
                          {a.isActive ? "Đang hoạt động" : "Tạm dừng"}
                        </small>
                      </div>
                      <AdminIcon name="chevron" />
                    </Link>
                  ))}
                </div>
              </Panel>
              <Notice>
                {d.mockPayments ? "Kỳ này có giao dịch mô phỏng MOCK. " : ""}Giá
                và lịch gắn LOCAL_DEMO là dữ liệu nội bộ mô phỏng. Chỉ thị
                trường đã cấu hình API đối tác mới có dữ liệu từ nhà cung cấp;
                polling không phải dữ liệu radar trực tiếp.
              </Notice>
              {d.report.unknownRefunds > 0 && (
                <Notice warning>
                  Có {amount(d.report.unknownRefunds, d.report.currency)} khoản
                  hoàn cũ chưa ghi nhận thời điểm. Chưa tính thuần cho đến khi
                  đối soát.
                </Notice>
              )}
            </>
          )}
        </>
      </DataState>
    </>
  );
}
function PriceOverview({
  query,
  revision,
}: {
  query: string;
  revision: number;
}) {
  const params = new URLSearchParams(query);
  params.set("page", "1");
  params.set("pageSize", "5");
  params.set("cabinClass", "ECONOMY");
  const state = useAdminData<FareHistory>(
      "/admin/fares/history",
      params.toString(),
      revision,
      30000,
    ),
    d = state.data;
  return (
    <Panel
      title="Nhịp quan sát giá vé"
      subtitle="Giá phổ thông của tối đa 5 chuyến trong phạm vi đang theo dõi"
      action={
        <MiniLink to={"/admin/fares?" + params.toString()}>
          Phân tích giá chi tiết
        </MiniLink>
      }
      className="ad-price-overview"
    >
      <DataState {...state}>
        {d && (
          <>
            <LineChart
              points={d.series}
              hasObservations={d.totalObservations > 0}
              metrics={[
                { key: "average", label: "Giá bình quân", color: "var(--ad-chart-blue)" },
                { key: "min", label: "Thấp nhất", color: "var(--ad-chart-teal)" },
              ]}
              emptyMessage="Chưa có quan sát giá trong kỳ đang chọn. Lịch sử bắt đầu khi giá được ghi nhận."
            />
            <p className="ad-chart-foot">
              {d.totalObservations.toLocaleString("vi-VN")} quan sát ·{" "}
              {d.items.length} hạng phổ thông
              {d.items.length
                ? " · " + d.items.map((f) => f.flight.flightNumber).join(", ")
                : ""}
              . Khoảng ngày áp dụng cho thời điểm quan sát; không đại diện toàn
              thị trường.{" "}
              {d.series.length === 1
                ? "Hiện có một mốc; chưa đủ dữ liệu để kết luận xu hướng."
                : ""}
            </p>
          </>
        )}
      </DataState>
    </Panel>
  );
}
