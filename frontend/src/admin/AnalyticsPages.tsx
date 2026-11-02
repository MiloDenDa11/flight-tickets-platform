import { useState } from "react";
import { cabinName } from "../utils/format";
import { FareHistory, FareRow, FilterUpdate, Revenue, Settings } from "./types";
import { amount, downloadCsv, stamp, useAdminData } from "./useAdminData";
import {
  Badge,
  Column,
  DataState,
  DataTable,
  GroupToggle,
  Kpi,
  Notice,
  PageTitle,
  Panel,
  Paginator,
  Status,
} from "./ui";
import { AirlineChart, LineChart } from "./Charts";
import { PageProps } from "./ManagementPages";
import AdminIcon from "./Icons";
export function FaresPage({ query, revision, update, edit }: PageProps) {
  const state = useAdminData<FareHistory>(
      "/admin/fares/history",
      query,
      revision,
      30000,
    ),
    params = new URLSearchParams(query),
    d = state.data;
  const columns: Column<FareRow>[] = [
    {
      key: "flight",
      title: "Chuyến / hành trình",
      sort: "DATE",
      cell: (f) => (
        <button className="ad-ref" onClick={() => update({ fareId: f.id })}>
          {f.flight.flightNumber}
          <small>
            {f.flight.origin.code} → {f.flight.destination.code} ·{" "}
            {stamp(f.flight.departureTime)}
          </small>
          <small>{f.flight.airline.name}</small>
        </button>
      ),
    },
    {
      key: "cabin",
      title: "Hạng vé",
      cell: (f) => (
        <>
          {cabinName(f.cabinClass)}
          <small>{f.availableSeats} ghế còn lại</small>
        </>
      ),
    },
    {
      key: "current",
      title: "Giá hiện tại",
      cell: (f) => (
        <>
          <b>{amount(f.basePrice + f.tax)}</b>
          <small>Quan sát {stamp(f.priceObservedAt)}</small>
        </>
      ),
    },
    {
      key: "previous",
      title: "Giá trước / biến động",
      cell: (f) => (
        <>
          {f.previousPrice !== null ? (
            amount(f.previousPrice)
          ) : (
            <span className="ad-muted">Chưa có mốc trước</span>
          )}
          <small>
            {f.changePercent !== null ? (
              <Badge
                tone={
                  f.changePercent > 0
                    ? "red"
                    : f.changePercent < 0
                      ? "green"
                      : "neutral"
                }
              >
                {f.changePercent > 0 ? "↗ " : f.changePercent < 0 ? "↘ " : ""}
                {f.changePercent > 0 ? "+" : ""}
                {f.changePercent}%
              </Badge>
            ) : (
              "Không suy đoán xu hướng"
            )}
          </small>
        </>
      ),
    },
    {
      key: "stats",
      title: "Thống kê trong kỳ",
      cell: (f) => (
        <>
          {f.minimumPrice !== null ? (
            <>
              Thấp nhất <b>{amount(f.minimumPrice)}</b>
              <small>
                TB {amount(f.averagePrice)} · {f.historyCount} quan sát
              </small>
            </>
          ) : (
            <span className="ad-muted">Chưa có quan sát trong kỳ</span>
          )}
        </>
      ),
    },
    {
      key: "source",
      title: "Nguồn",
      cell: (f) => (
        <>
          <Badge tone={f.source === "LOCAL_DEMO" ? "amber" : "blue"}>
            {f.source === "LOCAL_DEMO" ? "LOCAL DEMO" : f.source}
          </Badge>
          <small>
            {f.source === "LOCAL_DEMO"
              ? "Giá nội bộ"
              : "Giá quản lý bởi đối tác"}
          </small>
        </>
      ),
    },
    {
      key: "action",
      title: "Thao tác",
      cell: (f) => (
        <div className="ad-row-actions">
          <button
            className="ad-text-btn"
            onClick={() => update({ fareId: f.id })}
          >
            Xem lịch sử
          </button>
          {f.source === "LOCAL_DEMO" && (
            <button
              className="ad-text-btn"
              onClick={() => edit({ type: "fare", data: f })}
            >
              Sửa giá nội bộ
            </button>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <PageTitle eyebrow="GIÁ VÉ & QUAN SÁT" title="Phân tích giá vé">
        Lịch sử giá có nguồn và thời điểm quan sát. Không dựng dữ liệu cho
        khoảng thời gian chưa ghi nhận.
      </PageTitle>
      <Notice>
        Bộ lọc từ / đến ngày áp dụng cho thời điểm quan sát giá. Chọn riêng
        “Ngày bay” để giới hạn lịch khởi hành; chọn một giá vé để xem lịch sử
        của đúng chuyến và hạng.
      </Notice>
      <Panel>
        <div className="ad-analytics-filters">
          <label>
            Ngày bay
            <input
              type="date"
              value={params.get("departureDate") ?? ""}
              onChange={(e) =>
                update({ departureDate: e.target.value, fareId: undefined })
              }
            />
          </label>
          <label>
            Hạng ghế
            <select
              value={params.get("cabinClass") ?? ""}
              onChange={(e) =>
                update({ cabinClass: e.target.value, fareId: undefined })
              }
            >
              <option value="">Tất cả hạng vé</option>
              {["ECONOMY", "PREMIUM", "BUSINESS"].map((c) => (
                <option key={c} value={c}>
                  {cabinName(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số hành khách
            <input
              type="number"
              min="1"
              max="9"
              placeholder="Không giới hạn"
              value={params.get("passengers") ?? ""}
              onChange={(e) =>
                update({ passengers: e.target.value, fareId: undefined })
              }
            />
          </label>
          <label>
            Phạm vi biểu đồ
            <select
              value={params.get("fareId") ?? ""}
              onChange={(e) => update({ fareId: e.target.value })}
            >
              <option value="">Các giá đang xem trong trang</option>
              {d?.items.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.flight.flightNumber} · {cabinName(f.cabinClass)} · #{f.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>
      <DataState {...state}>
        {d && (
          <>
            <div className="ad-kpi-grid compact">
              <Kpi
                label="Giá vé phù hợp"
                value={d.pagination.total}
                icon="fares"
                hint="Theo chuyến / hạng / tồn ghế"
              />
              <Kpi
                label="Quan sát trong phạm vi"
                value={d.totalObservations}
                icon="activity"
                accent="teal"
                hint="Của các giá đang xem"
              />
              <div className="ad-fare-observation-note">
                <AdminIcon name="shield" />
                <div>
                  <b>Lịch sử có thể chỉ có một mốc.</b>
                  <p>
                    Không có biến động nếu chưa ghi nhận ít nhất hai giá. Mỗi
                    cập nhật nội bộ hoặc đồng bộ mới tạo một quan sát.
                  </p>
                </div>
              </div>
            </div>
            <Panel
              title={
                params.get("fareId")
                  ? "Lịch sử giá vé đã chọn"
                  : "Giá bình quân các lần quan sát"
              }
              subtitle={
                params.get("fareId")
                  ? "Đúng chuyến bay và hạng ghế đang chọn"
                  : "Phạm vi: các giá trên trang hiện tại, không phải toàn thị trường"
              }
              action={
                <GroupToggle
                  value={params.get("group") ?? "DAY"}
                  update={update}
                />
              }
            >
              <LineChart
                hasObservations={d.totalObservations > 0}
                points={d.series}
                metrics={[
                  { key: "average", label: "Giá bình quân", color: "var(--ad-chart-blue)" },
                  { key: "min", label: "Thấp nhất", color: "var(--ad-chart-teal)" },
                ]}
                emptyMessage="Chưa có quan sát giá trong khoảng thời gian đang chọn."
              />
              {d.series.length === 1 && (
                <p className="ad-chart-foot">
                  Một mốc quan sát thực tế. Chưa đủ dữ liệu để kết luận xu hướng
                  tăng hoặc giảm.
                </p>
              )}
            </Panel>
            <Panel
              title="Giá vé & biến động"
              subtitle="Giá hiện tại là mức mới nhất; thấp nhất và bình quân tính theo các quan sát trong kỳ"
            >
              <DataTable
                items={d.items}
                columns={columns}
                label="Bảng giá vé và lịch sử"
                sort={params.get("sort") ?? "desc"}
                onSort={update}
              />
              <Paginator value={d.pagination} onChange={update} />
            </Panel>
            {d.observations.length > 0 && (
              <Panel
                title="Quan sát gần nhất"
                subtitle={`Hiển thị ${Math.min(10, d.observations.length)} quan sát mới nhất trong phạm vi đang xem`}
              >
                <div className="ad-observation-feed">
                  {d.observations.slice(0, 10).map((o) => (
                    <div key={o.id}>
                      <span className="ad-status-dot" />
                      <div>
                        <b>
                          {o.flightNumber} · {cabinName(o.cabinClass)}
                        </b>
                        <small>
                          {o.originCode} → {o.destinationCode} · {o.source}
                        </small>
                      </div>
                      <strong>{amount(o.totalPrice, o.currency)}</strong>
                      <time>{stamp(o.recordedAt)}</time>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}
      </DataState>
    </>
  );
}
export function RevenuePage({
  query,
  revision,
  update,
}: Pick<PageProps, "query" | "revision" | "update">) {
  const state = useAdminData<Revenue>("/admin/revenue", query, revision, 30000),
    config = useAdminData<Settings>("/admin/settings"),
    params = new URLSearchParams(query),
    d = state.data;
  const [busy, setBusy] = useState(false),
    [exportError, setExportError] = useState("");
  const currencies = [
    ...new Set([
      "VND",
      ...(config.data?.currencies ?? []),
      params.get("currency") ?? "VND",
    ]),
  ];
  return (
    <>
      <PageTitle
        eyebrow="THANH TOÁN & ĐỐI SOÁT"
        title="Doanh thu & báo cáo"
        action={
          <button
            className="ad-btn"
            disabled={busy || !d}
            onClick={async () => {
              setBusy(true);
              setExportError("");
              try {
                await downloadCsv(
                  "/admin/revenue/export.csv",
                  query,
                  "flight-revenue.csv",
                );
              } catch {
                setExportError(
                  "Không xuất được báo cáo. Thử khoảng ngày ngắn hơn hoặc đăng nhập lại.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <AdminIcon name="download" />
            {busy ? "Đang xuất…" : "Xuất báo cáo CSV"}
          </button>
        }
      >
        Thực thu, hoàn tiền và doanh thu thuần theo giao dịch; không cộng các
        đơn chưa thanh toán.
      </PageTitle>
      <div className="ad-report-controls">
        <Notice>
          Phân bổ tiền theo giá từng chặng để tránh đếm trùng chuyến khứ hồi
          hoặc khác hãng. Thu và hoàn nhóm theo thời điểm tương ứng.
        </Notice>
        <label>
          Tiền tệ
          <select
            value={params.get("currency") ?? "VND"}
            onChange={(e) => update({ currency: e.target.value })}
          >
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {exportError && <Notice warning>{exportError}</Notice>}
      <DataState {...state}>
        {d && (
          <>
            <div className="ad-kpi-grid revenue">
              <Kpi
                label="Thực thu thành công"
                value={d.gross}
                money
                currency={d.currency}
                icon="revenue"
                hint="Bao gồm khoản thu được hoàn sau đó"
              />
              <Kpi
                label="Đã hoàn trong kỳ"
                value={d.refunds}
                money
                currency={d.currency}
                icon="activity"
                accent="coral"
                hint="Theo thời điểm hoàn tiền"
              />
              {d.net !== null ? (
                <Kpi
                  label="Doanh thu thuần"
                  value={d.net}
                  money
                  currency={d.currency}
                  icon="check"
                  accent="teal"
                  hint="Thực thu trừ khoản hoàn trong kỳ"
                />
              ) : (
                <div className="ad-kpi amber">
                  <span>Doanh thu thuần</span>
                  <strong>Chờ đối soát</strong>
                  <small>Khoản hoàn cũ thiếu thời điểm</small>
                </div>
              )}
              <Kpi
                label="Giá trị đơn bình quân"
                value={d.averageOrder}
                money
                currency={d.currency}
                icon="bookings"
                accent="violet"
                hint={d.orders + " giao dịch có thu trong kỳ"}
              />
            </div>
            {d.unknownRefunds > 0 && (
              <Notice warning>
                Có {amount(d.unknownRefunds, d.currency)} khoản hoàn chưa có
                thời điểm. Hệ thống không tự gán ngày hoàn; chưa xác định doanh
                thu thuần.
              </Notice>
            )}
            <div className="ad-grid-main">
              <Panel
                title="Dòng tiền theo thời gian"
                subtitle={"Thời gian Việt Nam · " + d.currency}
                action={
                  <GroupToggle
                    value={params.get("group") ?? "DAY"}
                    update={update}
                  />
                }
              >
                <LineChart
                  hasObservations={d.orders > 0 || d.refunds > 0}
                  points={d.series}
                  metrics={[
                    { key: "gross", label: "Thực thu", color: "var(--ad-chart-blue)" },
                    { key: "refunds", label: "Hoàn tiền", color: "var(--ad-chart-amber)" },
                  ]}
                  currency={d.currency}
                />
              </Panel>
              <Panel
                title="Tỷ trọng doanh thu theo hãng"
                subtitle="Tính trên khoản thu thành công"
              >
                <AirlineChart
                  items={d.byAirline}
                  currency={d.currency}
                  mode="donut"
                />
              </Panel>
            </div>
            <Panel
              title="Giao dịch đối soát"
              subtitle="Một giao dịch trên mỗi đơn. Nhà cung cấp thanh toán được hiển thị rõ."
            >
              <DataTable
                items={d.transactions}
                label="Giao dịch đối soát doanh thu"
                columns={[
                  {
                    key: "ref",
                    title: "Mã đặt vé / giao dịch",
                    cell: (t) => (
                      <>
                        <b>{t.reference}</b>
                        <small className="ad-mono">{t.id.slice(0, 12)}…</small>
                      </>
                    ),
                  },
                  {
                    key: "route",
                    title: "Chuyến bay",
                    cell: (t) => t.flightNumbers,
                  },
                  {
                    key: "source",
                    title: "Thanh toán",
                    cell: (t) => (
                      <>
                        <Badge tone={t.provider === "MOCK" ? "amber" : "blue"}>
                          {t.provider === "MOCK" ? "MOCK · DEMO" : t.provider}
                        </Badge>
                        <small>
                          <Status value={t.status} />
                        </small>
                      </>
                    ),
                  },
                  {
                    key: "date",
                    title: "Ngày thu / hoàn",
                    cell: (t) => (
                      <>
                        {stamp(t.paidAt)}
                        <small>
                          {t.refundedAt
                            ? "Hoàn " + stamp(t.refundedAt)
                            : "Chưa ghi nhận hoàn"}
                        </small>
                      </>
                    ),
                  },
                  {
                    key: "gross",
                    title: "Thực thu trong kỳ",
                    cell: (t) => <b>{amount(t.gross, d.currency)}</b>,
                  },
                  {
                    key: "refund",
                    title: "Hoàn trong kỳ",
                    cell: (t) => (
                      <span className={t.refund ? "ad-negative" : ""}>
                        {amount(t.refund, d.currency)}
                      </span>
                    ),
                  },
                ]}
              />
              {d.pagination && (
                <Paginator value={d.pagination} onChange={update} />
              )}
              <p className="ad-chart-foot">
                Xuất CSV toàn bộ giao dịch phù hợp (tối đa 50.000). Nền tảng
                hiện sử dụng VND, không quy đổi ngoại tệ.
              </p>
            </Panel>
            <Notice>{d.note}</Notice>
          </>
        )}
      </DataState>
    </>
  );
}
export function ClearFareFilter({ update }: { update: FilterUpdate }) {
  return (
    <button
      className="ad-text-btn"
      onClick={() => update({ fareId: undefined })}
    >
      Xem các hạng vé khác
    </button>
  );
}
