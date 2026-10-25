import { useState } from "react";
import { Airport, Review } from "../types";
import { AuditEvent, Page, Settings, SyncStatus } from "./types";
import { stamp, useAdminData } from "./useAdminData";
import {
  Badge,
  Column,
  DataState,
  DataTable,
  EmptyState,
  Notice,
  PageTitle,
  Panel,
  Paginator,
  SearchBar,
  Status,
} from "./ui";
import { PageProps } from "./ManagementPages";
import AdminIcon from "./Icons";
const kindName = {
  schedule: "Lịch bay công bố",
  status: "Trạng thái khai thác",
  fares: "Giá vé & tồn ghế",
};
export function SettingsPage({
  revision,
  mutate,
  theme,
  setTheme,
  sync,
}: {
  revision: number;
  mutate: PageProps["mutate"];
  theme: string;
  setTheme: (s: string) => void;
  sync: SyncStatus | null;
}) {
  const state = useAdminData<Settings>("/admin/settings", "", revision, 60000),
    d = state.data;
  const [working, setWorking] = useState("");
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE SETTINGS"
        title="Không gian của bạn. Quyền kiểm soát của bạn."
      >
        Kiểm tra kết nối, nguồn dữ liệu và thiết lập hiển thị của trung tâm điều
        hành.
      </PageTitle>
      <DataState {...state}>
        {d && (
          <>
            <div className="ad-connection-grid">
              {[
                ["PostgreSQL", "Cơ sở dữ liệu chính", d.database, "dashboard"],
                ["Redis", "Bộ nhớ đệm tìm kiếm", d.cache, "activity"],
                [
                  "Thanh toán",
                  d.mockPayments
                    ? "Môi trường mô phỏng MOCK"
                    : "Chưa cấu hình cổng thanh toán",
                  d.mockPayments,
                  "shield",
                ],
              ].map(([name, sub, ok, icon]) => (
                <Panel key={String(name)}>
                  <div className="ad-connection-head">
                    <span>
                      <AdminIcon
                        name={icon as "dashboard" | "activity" | "shield"}
                      />
                    </span>
                    <Badge
                      tone={
                        name === "Thanh toán" && d.mockPayments
                          ? "amber"
                          : ok
                            ? "green"
                            : "red"
                      }
                    >
                      {name === "Thanh toán"
                        ? d.mockPayments
                          ? "DEMO"
                          : "Chưa cấu hình"
                        : ok
                          ? "Sẵn sàng"
                          : "Mất kết nối"}
                    </Badge>
                  </div>
                  <h3>{name}</h3>
                  <p>{sub}</p>
                </Panel>
              ))}
            </div>
            <Panel
              title="Nguồn dữ liệu hàng không"
              subtitle="Cấu hình endpoint và khóa API tại máy chủ; không gửi khóa về trình duyệt"
              action={
                <Badge tone={sync?.automatic ? "green" : "neutral"}>
                  {sync?.automatic
                    ? "Tự động · " + sync.intervalSeconds + "s"
                    : "Đồng bộ thủ công"}
                </Badge>
              }
            >
              <div className="ad-provider-header">
                <div>
                  <AdminIcon name="globe" />
                  <span>
                    <b>{d.provider}</b>
                    <small>
                      {d.apiKeyConfigured
                        ? "Đã đặt khóa API tại server"
                        : "Chưa đặt khóa API; endpoint công khai có thể không yêu cầu khóa"}
                    </small>
                  </span>
                </div>
                <Badge tone="blue">{d.timeZone}</Badge>
              </div>
              <div className="ad-source-grid">
                {(["schedule", "status", "fares"] as const).map((kind) => {
                  const source = sync?.kinds.find((s) => s.kind === kind);
                  const running = Boolean(
                    source?.runningUntil &&
                      new Date(source.runningUntil) > new Date(),
                  );
                  const cooling = Boolean(
                    source?.nextAllowedAt &&
                      new Date(source.nextAllowedAt) > new Date(),
                  );
                  return (
                    <article key={kind}>
                      <div className="ad-source-icon">
                        <AdminIcon
                          name={
                            kind === "schedule"
                              ? "flights"
                              : kind === "status"
                                ? "activity"
                                : "fares"
                          }
                        />
                        <Badge
                          tone={
                            running
                              ? "blue"
                              : source?.configured
                                ? "green"
                                : "amber"
                          }
                        >
                          {running
                            ? "Đang đồng bộ"
                            : source?.configured
                              ? "Đã cấu hình"
                              : "Chưa cấu hình"}
                        </Badge>
                      </div>
                      <h3>{kindName[kind]}</h3>
                      <p>
                        {kind === "schedule"
                          ? "Giờ khởi hành, giờ đến và máy bay từ lịch công bố."
                          : kind === "status"
                            ? "Chỉ hiển thị trạng thái và thời gian thực tế khi nguồn cung cấp."
                            : "Giá, hạng ghế và khả dụng; mỗi giá mới tạo một quan sát."}
                      </p>
                      <dl>
                        <div>
                          <dt>Thử gần nhất</dt>
                          <dd>{stamp(source?.lastAttemptAt)}</dd>
                        </div>
                        <div>
                          <dt>Thành công</dt>
                          <dd>{stamp(source?.lastSuccessAt)}</dd>
                        </div>
                        {source?.lastError && (
                          <div>
                            <dt>Kết quả</dt>
                            <dd className="ad-negative">{source.lastError}</dd>
                          </div>
                        )}
                        {cooling && (
                          <div>
                            <dt>Cho phép lại</dt>
                            <dd>{stamp(source?.nextAllowedAt)}</dd>
                          </div>
                        )}
                      </dl>
                      <button
                        className="ad-btn secondary"
                        disabled={
                          !source?.configured ||
                          running ||
                          cooling ||
                          Boolean(working)
                        }
                        onClick={async () => {
                          setWorking(kind);
                          try {
                            await mutate("post", "/sync/" + kind);
                          } catch {
                          } finally {
                            setWorking("");
                          }
                        }}
                      >
                        <AdminIcon name="refresh" />
                        {working === kind || running
                          ? "Đang xử lý…"
                          : "Đồng bộ ngay"}
                      </button>
                      {!source?.configured && (
                        <small>
                          Thiết lập nguồn ở cấu hình môi trường backend.
                        </small>
                      )}
                    </article>
                  );
                })}
              </div>
              <Notice>
                {sync?.sourceNotice ??
                  "Chưa có API đối tác. Dữ liệu nội bộ được ghi rõ là demo; không phải dữ liệu radar trực tiếp."}
              </Notice>
            </Panel>
            <div className="ad-grid-equal">
              <Panel
                title="Giao diện & trải nghiệm"
                subtitle="Lưu riêng trên trình duyệt này"
              >
                <div className="ad-theme-options">
                  {[
                    ["light", "Sáng", "sun"],
                    ["dark", "Tối", "moon"],
                  ].map(([key, label, icon]) => (
                    <button
                      key={key}
                      className={theme === key ? "active" : ""}
                      aria-pressed={theme === key}
                      onClick={() => setTheme(key)}
                    >
                      <AdminIcon name={icon as "sun" | "moon"} />
                      <span>{label}</span>
                      <i>{theme === key && <AdminIcon name="check" />}</i>
                    </button>
                  ))}
                </div>
                <p className="ad-chart-foot">
                  Tự giảm chuyển động theo thiết lập hệ điều hành. Giao diện
                  quản trị sử dụng múi giờ Việt Nam.
                </p>
              </Panel>
              <Panel
                title="Bảo vệ dữ liệu"
                subtitle="Quyền truy cập được thực thi tại backend"
              >
                <ul className="ad-security-list">
                  <li>
                    <AdminIcon name="check" />
                    Chỉ tài khoản ADMIN vào được API quản trị.
                  </li>
                  <li>
                    <AdminIcon name="check" />
                    CCCD chỉ trả về ba số cuối; không có dữ liệu đầy đủ ở
                    client.
                  </li>
                  <li>
                    <AdminIcon name="check" />
                    Nhật ký thao tác không chứa CCCD hoặc khóa API.
                  </li>
                  <li>
                    <AdminIcon name="check" />
                    Không tự sửa lịch / giá do nhà cung cấp quản lý.
                  </li>
                </ul>
              </Panel>
            </div>
            <Panel
              title="Tiến trình đồng bộ gần đây"
              subtitle="Kết quả thực tế của từng lần chạy"
            >
              {sync?.runs.length ? (
                <DataTable
                  items={sync.runs}
                  label="Nhật ký đồng bộ"
                  columns={[
                    {
                      key: "kind",
                      title: "Nguồn",
                      cell: (r) => (
                        <>
                          <b>{kindName[r.kind]}</b>
                          <small>{r.provider}</small>
                        </>
                      ),
                    },
                    {
                      key: "status",
                      title: "Kết quả",
                      cell: (r) => <Status value={r.status} />,
                    },
                    {
                      key: "count",
                      title: "Bản ghi",
                      cell: (r) => (
                        <>
                          {r.processed} đã nhận
                          <small>{r.skipped} bỏ qua / không đổi</small>
                        </>
                      ),
                    },
                    {
                      key: "error",
                      title: "Ghi chú",
                      cell: (r) => r.errorCode ?? "—",
                    },
                    {
                      key: "time",
                      title: "Thời gian",
                      cell: (r) => (
                        <>
                          {stamp(r.startedAt)}
                          <small>Kết thúc {stamp(r.finishedAt)}</small>
                        </>
                      ),
                    },
                  ]}
                />
              ) : (
                <EmptyState title="Chưa có lần đồng bộ nào">
                  Cấu hình một nguồn hợp lệ để bắt đầu. Hệ thống không tạo lượt
                  chạy giả.
                </EmptyState>
              )}
            </Panel>
          </>
        )}
      </DataState>
    </>
  );
}
const actionNames: Record<string, string> = {
  AIRLINE_CREATED: "Tạo hãng hàng không",
  AIRLINE_UPDATED: "Cập nhật hãng hàng không",
  AIRLINE_DELETED: "Xóa hãng hàng không",
  FLIGHT_CREATED: "Tạo lịch bay nội bộ",
  LOCAL_FARE_UPDATED: "Cập nhật giá nội bộ",
  LOCAL_FLIGHT_STATUS: "Đổi trạng thái bán",
  USER_ACCESS_UPDATED: "Thay đổi quyền tài khoản",
  BOOKING_CONTACT_VIEW: "Xem liên hệ đơn vé",
  BOOKING_LIST: "Xem danh sách đơn vé",
  BOOKING_EXPORT: "Xuất danh sách đơn vé",
  REVENUE_EXPORT: "Xuất báo cáo doanh thu",
  ADMIN_SEARCH: "Tra cứu quản trị",
  PROVIDER_SYNC: "Đồng bộ nguồn đối tác",
  AIRPORT_CREATED: "Tạo sân bay",
  AIRPORT_UPDATED: "Cập nhật sân bay",
  AIRPORT_DELETED: "Xóa sân bay",
  REVIEW_MODERATED: "Duyệt đánh giá",
  REVIEW_DELETED: "Xóa đánh giá",
};
export function ActivityPage({
  query,
  revision,
  update,
}: Pick<PageProps, "query" | "revision" | "update">) {
  const state = useAdminData<Page<AuditEvent>>(
    "/admin/activity",
    query,
    revision,
    30000,
  );
  return (
    <>
      <PageTitle
        eyebrow="AUDIT & ACCOUNTABILITY"
        title="Mọi thao tác đều có dấu vết."
      >
        Theo dõi thay đổi dữ liệu, xuất báo cáo và truy cập thông tin liên hệ.
        Không lưu CCCD đầy đủ trong nhật ký.
      </PageTitle>
      <Panel>
        <DataState {...state}>
          {state.data && (
            <>
              <DataTable
                items={state.data.items}
                label="Nhật ký quản trị"
                columns={[
                  {
                    key: "action",
                    title: "Hoạt động",
                    cell: (e) => <b>{actionNames[e.action] ?? e.action}</b>,
                  },
                  {
                    key: "actor",
                    title: "Người thực hiện",
                    cell: (e) => e.actor?.fullName ?? "Tác vụ hệ thống",
                  },
                  {
                    key: "entity",
                    title: "Đối tượng",
                    cell: (e) => (
                      <>
                        {e.entity}
                        <small className="ad-mono">{e.entityId ?? "—"}</small>
                      </>
                    ),
                  },
                  {
                    key: "metadata",
                    title: "Dữ liệu kiểm toán",
                    cell: (e) => (
                      <code className="ad-audit-meta">
                        {Object.keys(e.metadata).length
                          ? JSON.stringify(e.metadata)
                          : "—"}
                      </code>
                    ),
                  },
                  {
                    key: "time",
                    title: "Thời gian · VN",
                    cell: (e) => stamp(e.createdAt),
                  },
                ]}
              />
              <Paginator value={state.data.pagination} onChange={update} />
            </>
          )}
        </DataState>
      </Panel>
    </>
  );
}
export function LegacyDirectory({
  resource,
  ...props
}: PageProps & { resource: "airports" | "reviews" }) {
  const state = useAdminData<(Airport | Review)[]>(
      "/admin/" + resource,
      "",
      props.revision,
    ),
    [query, setQuery] = useState("");
  const rows = (state.data ?? []).filter((r) =>
    JSON.stringify(r)
      .toLocaleLowerCase("vi-VN")
      .includes(query.toLocaleLowerCase("vi-VN")),
  );
  const airportColumns: Column<Airport>[] = [
    {
      key: "code",
      title: "Mã IATA",
      cell: (a) => <Badge tone="blue">{a.code}</Badge>,
    },
    { key: "name", title: "Tên sân bay", cell: (a) => <b>{a.name}</b> },
    { key: "city", title: "Thành phố", cell: (a) => a.city },
    {
      key: "country",
      title: "Quốc gia / múi giờ",
      cell: (a) => (
        <>
          {a.country}
          <small>{a.timezone}</small>
        </>
      ),
    },
    {
      key: "coordinates",
      title: "Tọa độ",
      cell: (a) =>
        `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}`,
    },
    {
      key: "action",
      title: "Thao tác",
      cell: (a) => (
        <div className="ad-row-actions">
          <button
            className="ad-text-btn"
            onClick={() => props.edit({ type: "airport", data: a })}
          >
            Chỉnh sửa
          </button>
          <button
            className="ad-text-btn danger"
            onClick={() =>
              props.edit({
                type: "confirm",
                title: `Xóa sân bay ${a.code}? Chỉ xóa được khi không có dữ liệu liên quan.`,
                action: () => props.mutate("delete", "/airports/" + a.id),
              })
            }
          >
            Xóa
          </button>
        </div>
      ),
    },
  ];
  const reviewColumns: Column<Review>[] = [
    {
      key: "customer",
      title: "Khách hàng",
      cell: (r) => <b>{r.user.fullName}</b>,
    },
    { key: "airline", title: "Hãng", cell: (r) => r.airline.name },
    {
      key: "rating",
      title: "Đánh giá",
      cell: (r) => <Badge tone="amber">{r.rating} / 5</Badge>,
    },
    {
      key: "comment",
      title: "Nội dung",
      cell: (r) => <span className="ad-review-comment">{r.comment}</span>,
    },
    {
      key: "status",
      title: "Hiển thị",
      cell: (r) => (
        <Badge tone={r.isVisible ? "green" : "neutral"}>
          {r.isVisible ? "Công khai" : "Đã ẩn"}
        </Badge>
      ),
    },
    {
      key: "action",
      title: "Thao tác",
      cell: (r) => (
        <div className="ad-row-actions">
          <button
            className="ad-text-btn"
            onClick={() =>
              void props
                .mutate("patch", "/reviews/" + r.id, {
                  isVisible: !r.isVisible,
                })
                .catch(() => {})
            }
          >
            {r.isVisible ? "Ẩn" : "Hiện"}
          </button>
          <button
            className="ad-text-btn danger"
            onClick={() =>
              props.edit({
                type: "confirm",
                title: "Xóa đánh giá này?",
                action: () => props.mutate("delete", "/reviews/" + r.id),
              })
            }
          >
            Xóa
          </button>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow={
          resource === "airports" ? "AIRPORT DIRECTORY" : "REVIEW MODERATION"
        }
        title={
          resource === "airports"
            ? "Những điểm chạm của hành trình."
            : "Lắng nghe sau mỗi chuyến bay."
        }
        action={
          resource === "airports" ? (
            <button
              className="ad-btn"
              onClick={() => props.edit({ type: "airport" })}
            >
              <AdminIcon name="plus" />
              Thêm sân bay
            </button>
          ) : undefined
        }
      >
        {resource === "airports"
          ? "Quản lý sân bay, thành phố và vị trí. Giữ kiểm tra liên kết trước khi xóa."
          : "Duyệt, ẩn hoặc xóa đánh giá theo quyền quản trị hiện có."}
      </PageTitle>
      <Panel>
        <SearchBar
          value={query}
          onChange={(v) => setQuery(String(v.q ?? ""))}
          placeholder="Tìm trong danh mục…"
        />
        <DataState {...state}>
          {resource === "airports" ? (
            <DataTable
              items={rows as Airport[]}
              columns={airportColumns}
              label="Danh mục sân bay"
            />
          ) : (
            <DataTable
              items={rows as Review[]}
              columns={reviewColumns}
              label="Danh sách đánh giá"
            />
          )}
          <p className="ad-chart-foot">
            {rows.length} bản ghi đang hiển thị · Danh mục giữ giới hạn tải của
            API hiện có.
          </p>
        </DataState>
      </Panel>
    </>
  );
}
