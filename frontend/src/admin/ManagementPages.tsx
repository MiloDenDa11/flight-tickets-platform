import { useState } from "react";
import { Link } from "react-router-dom";
import AirlineMark from "../components/AirlineMark";
import { cabinName } from "../utils/format";
import {
  Column,
  DataState,
  DataTable,
  MiniLink,
  Notice,
  PageTitle,
  Panel,
  Paginator,
  SearchBar,
  Status,
  Badge,
} from "./ui";
import {
  Customer,
  FareRow,
  FilterUpdate,
  ManagedAirline,
  Page,
  SafeBooking,
  SourceFlight,
} from "./types";
import { amount, downloadCsv, stamp, useAdminData } from "./useAdminData";
import AdminIcon from "./Icons";
export type Mutation = (
  method: "post" | "put" | "patch" | "delete",
  path: string,
  data?: unknown,
) => Promise<void>;
export type Editing =
  | { type: "flight" }
  | { type: "fare"; data: FareRow | SourceFlight["fares"][number] }
  | { type: "airline"; data?: ManagedAirline }
  | { type: "airport"; data?: import("../types").Airport }
  | { type: "booking"; id: string }
  | { type: "confirm"; title: string; action: () => Promise<void> };
export type PageProps = {
  query: string;
  revision: number;
  update: FilterUpdate;
  edit: (value: Editing) => void;
  mutate: Mutation;
};
function SalesFilter({
  value,
  update,
  kind = "booking",
}: {
  value: string;
  update: FilterUpdate;
  kind?: "booking" | "flight" | "active";
}) {
  const entries =
    kind === "booking"
      ? [
          ["PENDING", "Chờ thanh toán"],
          ["CONFIRMED", "Đã xác nhận"],
          ["CANCELLED", "Đã hủy"],
          ["EXPIRED", "Hết hạn"],
        ]
      : kind === "flight"
        ? [
            ["SCHEDULED", "Đang mở bán"],
            ["CANCELLED", "Đã hủy / ngừng bán"],
            ["COMPLETED", "Đóng bán"],
            ["ON_TIME", "Đúng giờ"],
            ["DELAYED", "Chậm chuyến"],
            ["DEPARTED", "Đã cất cánh"],
            ["LANDED", "Đã hạ cánh"],
            ["DIVERTED", "Chuyển hướng"],
          ]
        : [
            ["ACTIVE", "Đang hoạt động"],
            ["INACTIVE", "Đã tạm ngừng"],
          ];
  return (
    <select
      aria-label="Lọc trạng thái"
      value={value}
      onChange={(e) => update({ status: e.target.value })}
    >
      <option value="">Tất cả trạng thái</option>
      {entries.map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
export function FlightsPage({
  query,
  revision,
  update,
  edit,
  mutate,
}: PageProps) {
  const state = useAdminData<Page<SourceFlight>>(
      "/admin/monitoring",
      query,
      revision,
      30000,
    ),
    params = new URLSearchParams(query);
  const columns: Column<SourceFlight>[] = [
    {
      key: "flight",
      title: "Chuyến bay",
      sort: "FLIGHT",
      cell: (f) => (
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
      ),
    },
    {
      key: "route",
      title: "Hành trình",
      cell: (f) => (
        <>
          <b>
            {f.origin.code} → {f.destination.code}
          </b>
          <small>
            {f.origin.city} · {f.destination.city}
          </small>
        </>
      ),
    },
    {
      key: "date",
      title: "Lịch công bố · VN",
      sort: "DATE",
      cell: (f) => (
        <>
          <b>{stamp(f.departureTime)}</b>
          <small>Đến {stamp(f.arrivalTime)}</small>
          <small>{f.aircraft}</small>
        </>
      ),
    },
    {
      key: "operational",
      title: "Khai thác thực tế",
      cell: (f) => (
        <>
          <Status value={f.operationalStatus} />
          <small>
            {f.statusObservedAt
              ? "Nguồn " + f.statusSource + " · " + stamp(f.statusObservedAt)
              : "Chưa có API trạng thái"}
          </small>
          {(f.actualDepartureTime || f.actualArrivalTime) && (
            <small>
              Thực tế: {stamp(f.actualDepartureTime)} →{" "}
              {stamp(f.actualArrivalTime)}
            </small>
          )}
        </>
      ),
    },
    {
      key: "fares",
      title: "Giá vé / tồn ghế",
      cell: (f) => (
        <div className="ad-fare-stack">
          {f.fares.length ? (
            f.fares.map((fare) => (
              <button
                key={fare.id}
                disabled={f.source !== "LOCAL_DEMO"}
                title={
                  f.source !== "LOCAL_DEMO"
                    ? "Giá do đối tác quản lý"
                    : "Chỉnh giá / ghế nội bộ"
                }
                onClick={() => edit({ type: "fare", data: fare })}
              >
                <b>{amount(fare.basePrice + fare.tax, "VND", true)}</b>
                <small>
                  {cabinName(fare.cabinClass)} · {fare.availableSeats}/
                  {fare.totalSeats} ghế{f.source === "LOCAL_DEMO" ? " ↗" : ""}
                </small>
              </button>
            ))
          ) : (
            <span className="ad-muted">Chưa có giá từ nguồn</span>
          )}
        </div>
      ),
    },
    {
      key: "source",
      title: "Nguồn / bán vé",
      cell: (f) => (
        <>
          <Badge tone={f.source === "LOCAL_DEMO" ? "amber" : "blue"}>
            {f.source === "LOCAL_DEMO" ? "DEMO" : f.source}
          </Badge>
          <small>
            {f.scheduleObservedAt
              ? "Lấy lịch: " + stamp(f.scheduleObservedAt)
              : "Lịch nội bộ"}
          </small>
          {f.status === "SCHEDULED" &&
          ["CANCELLED", "DIVERTED", "DEPARTED", "LANDED"].includes(
            f.operationalStatus ?? "",
          ) ? (
            <Badge tone="amber">Đóng nhận đặt vé</Badge>
          ) : (
            <Status value={f.status} />
          )}
        </>
      ),
    },
    {
      key: "action",
      title: "Thao tác",
      cell: (f) =>
        f.source === "LOCAL_DEMO" ? (
          <button
            className="ad-text-btn"
            onClick={() =>
              edit({
                type: "confirm",
                title: `${f.status === "SCHEDULED" ? "Ngừng" : "Mở"} bán ${f.flightNumber}? Chỉ thay đổi khi không còn đơn đang hoạt động.`,
                action: () =>
                  mutate("patch", `/flights/${f.id}/status`, {
                    status:
                      f.status === "SCHEDULED" ? "CANCELLED" : "SCHEDULED",
                  }),
              })
            }
          >
            {f.status === "SCHEDULED" ? "Ngừng bán" : "Mở bán"}
          </button>
        ) : (
          <span className="ad-readonly">
            <AdminIcon name="shield" />
            Đồng bộ từ nguồn
          </span>
        ),
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="FLIGHT MONITORING"
        title="Điều phối bầu trời."
        action={
          <button className="ad-btn" onClick={() => edit({ type: "flight" })}>
            <AdminIcon name="plus" />
            Tạo lịch nội bộ
          </button>
        }
      >
        Lịch xuất bản, trạng thái khai thác và tồn ghế trong một không gian.
      </PageTitle>
      <Notice>
        Polling database mỗi 30 giây. Khi chưa có nguồn trạng thái, hệ thống giữ
        nhãn “Chưa có dữ liệu”; không suy đoán chuyến bay đúng giờ.
      </Notice>
      {params.has("flightId") && (
        <Notice>
          Đang xem chuyến #{params.get("flightId")} đã chọn.{" "}
          <button
            className="ad-text-btn"
            onClick={() => update({ flightId: undefined })}
          >
            Xem các chuyến khác trong ngày
          </button>
        </Notice>
      )}
      <Panel>
        <SearchBar
          value={params.get("q") ?? ""}
          onChange={update}
          placeholder="Số hiệu, hãng hoặc mã sân bay…"
        >
          <SalesFilter
            kind="flight"
            value={params.get("status") ?? ""}
            update={update}
          />
        </SearchBar>
        <DataState {...state}>
          {state.data && (
            <>
              <DataTable
                items={state.data.items}
                columns={columns}
                label="Danh sách chuyến bay"
                sort={params.get("sort") ?? "desc"}
                onSort={update}
              />
              <Paginator value={state.data.pagination} onChange={update} />
            </>
          )}
        </DataState>
      </Panel>
    </>
  );
}
export function BookingsPage({ query, revision, update, edit }: PageProps) {
  const state = useAdminData<Page<SafeBooking>>(
      "/admin/booking-management",
      query,
      revision,
      30000,
    ),
    params = new URLSearchParams(query);
  const [exporting, setExporting] = useState(false),
    [downloadError, setDownloadError] = useState("");
  const columns: Column<SafeBooking>[] = [
    {
      key: "ref",
      title: "Mã đặt vé",
      sort: "DATE",
      cell: (b) => (
        <button
          className="ad-ref"
          onClick={() => edit({ type: "booking", id: b.id })}
        >
          {b.reference}
          <small>{stamp(b.createdAt)}</small>
        </button>
      ),
    },
    {
      key: "customer",
      title: "Người đặt",
      cell: (b) => (
        <>
          <b>{b.user?.fullName ?? "Khách hàng"}</b>
          <small>{b.contactEmail}</small>
          <small>{b.contactPhone}</small>
        </>
      ),
    },
    {
      key: "flight",
      title: "Hành trình",
      cell: (b) => (
        <>
          {b.segments.map((s) => (
            <div key={s.id}>
              <b>
                {s.fare.flight.origin.code} → {s.fare.flight.destination.code}
              </b>
              <small>
                {s.fare.flight.flightNumber} ·{" "}
                {stamp(s.fare.flight.departureTime)}
              </small>
            </div>
          ))}
        </>
      ),
    },
    {
      key: "passengers",
      title: "Hành khách / CCCD",
      cell: (b) => (
        <div className="ad-passengers">
          {b.passengers.map((p) => (
            <div key={p.id}>
              <b>{p.fullName}</b>
              <code>{p.maskedCitizenId}</code>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "amount",
      title: "Tổng tiền",
      sort: "AMOUNT",
      cell: (b) => (
        <>
          <b>{amount(b.totalAmount, b.currency)}</b>
          <small>
            {b.passengers.length} hành khách · {b.segments.length} chặng
          </small>
        </>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      cell: (b) => (
        <>
          <Status value={b.status} />
          <small>
            {b.payment ? (
              <>
                <Status value={b.payment.status} /> · {b.payment.provider}
              </>
            ) : (
              "Chưa thanh toán"
            )}
          </small>
        </>
      ),
    },
    {
      key: "action",
      title: "Chi tiết",
      cell: (b) => (
        <button
          className="ad-icon-btn"
          aria-label={"Xem đơn " + b.reference}
          onClick={() => edit({ type: "booking", id: b.id })}
        >
          <AdminIcon name="chevron" />
        </button>
      ),
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="BOOKING OPERATIONS"
        title="Từng vé. Từng hành trình."
        action={
          <button
            className="ad-btn secondary"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              setDownloadError("");
              try {
                await downloadCsv(
                  "/admin/booking-management/export.csv",
                  query,
                  "flight-bookings.csv",
                );
              } catch {
                setDownloadError(
                  "Không xuất được CSV. Thử thu hẹp bộ lọc hoặc đăng nhập lại.",
                );
              } finally {
                setExporting(false);
              }
            }}
          >
            <AdminIcon name="download" />
            {exporting ? "Đang xuất…" : "Xuất CSV"}
          </button>
        }
      >
        Tra cứu đơn và hành khách. Dữ liệu định danh luôn được che tại máy chủ.
      </PageTitle>
      <Notice>
        CCCD chỉ hiện 3 số cuối. Màn hình chi tiết có thông tin liên hệ phục vụ
        hỗ trợ khách; mỗi lần mở đều được ghi nhật ký.
      </Notice>
      {downloadError && <Notice warning>{downloadError}</Notice>}
      {params.has("customerId") && (
        <Notice>
          Đang xem đơn của tài khoản #{params.get("customerId")} trong kỳ đã
          chọn.{" "}
          <button
            className="ad-text-btn"
            onClick={() => update({ customerId: undefined })}
          >
            Bỏ lọc khách hàng
          </button>
        </Notice>
      )}
      <Panel>
        <SearchBar
          value={params.get("q") ?? ""}
          onChange={update}
          placeholder="Mã đơn, khách hàng, email hoặc chuyến bay…"
        >
          <SalesFilter value={params.get("status") ?? ""} update={update} />
          <select
            aria-label="Lọc thanh toán"
            value={params.get("paymentStatus") ?? ""}
            onChange={(e) => update({ paymentStatus: e.target.value })}
          >
            <option value="">Mọi thanh toán</option>
            <option value="PAID">Đã thu</option>
            <option value="REFUNDED">Đã hoàn</option>
            <option value="UNPAID">Chưa thanh toán</option>
          </select>
        </SearchBar>
        <DataState {...state}>
          {state.data && (
            <>
              <DataTable
                items={state.data.items}
                columns={columns}
                label="Danh sách đơn đặt vé"
                sort={params.get("sort") ?? "desc"}
                onSort={update}
              />
              <Paginator value={state.data.pagination} onChange={update} />
            </>
          )}
        </DataState>
      </Panel>
    </>
  );
}
export function BookingDetail({ id }: { id: string }) {
  const state = useAdminData<SafeBooking>("/admin/bookings/" + id);
  const b = state.data;
  return (
    <DataState {...state}>
      {b && (
        <div className="ad-booking-detail">
          <span className="ad-eyebrow">BOOKING DETAILS · AUDITED ACCESS</span>
          <h2>{b.reference}</h2>
          <div className="ad-detail-status">
            <Status value={b.status} />
            <span>Tạo {stamp(b.createdAt)}</span>
          </div>
          <div className="ad-contact-card">
            <AdminIcon name="customers" />
            <div>
              <strong>{b.user?.fullName}</strong>
              <p>
                {b.contactEmail}
                <br />
                {b.contactPhone}
              </p>
            </div>
          </div>
          <h3>Hành trình đã đặt</h3>
          {b.segments.map((s) => (
            <div className="ad-segment-card" key={s.id}>
              <div>
                <b>{s.fare.flight.flightNumber}</b>
                <Badge tone="blue">{cabinName(s.cabinClass)}</Badge>
              </div>
              <strong>
                {s.fare.flight.origin.code}
                <AdminIcon name="flights" />
                {s.fare.flight.destination.code}
              </strong>
              <p>
                {stamp(s.fare.flight.departureTime)} →{" "}
                {stamp(s.fare.flight.arrivalTime)} · giờ Việt Nam
              </p>
              <small>
                {amount(s.unitPrice, b.currency)}/người · Ký gửi {s.baggageKg}{" "}
                kg · Xách tay {s.cabinBaggageKg} kg
              </small>
            </div>
          ))}
          <h3>Hành khách & định danh đã che</h3>
          {b.passengers.map((p) => (
            <div className="ad-passenger-card" key={p.id}>
              <div>
                <b>{p.fullName}</b>
                <small>{p.nationality}</small>
              </div>
              <code>{p.maskedCitizenId}</code>
              <small>
                {p.tickets?.map((t) => t.number).join(" · ") ||
                  "Chưa phát hành vé"}
              </small>
            </div>
          ))}
          <div className="ad-detail-total">
            <span>Tổng giá trị đơn</span>
            <strong>{amount(b.totalAmount, b.currency)}</strong>
          </div>
          {b.payment && (
            <div className="ad-payment-detail">
              <Status value={b.payment.status} />
              <span>
                {b.payment.provider} · Thu {stamp(b.payment.paidAt)}
              </span>
              {b.payment.status === "REFUNDED" && (
                <span>Hoàn: {stamp(b.payment.refundedAt)}</span>
              )}
            </div>
          )}
          <Notice>
            Định danh đã được che từ API. Không có CCCD đầy đủ trong trang,
            tooltip hay CSV.
          </Notice>
        </div>
      )}
    </DataState>
  );
}
export function AirlinesPage({
  query,
  revision,
  update,
  edit,
  mutate,
}: PageProps) {
  const state = useAdminData<Page<ManagedAirline>>(
      "/admin/airline-catalog",
      query,
      revision,
    ),
    params = new URLSearchParams(query);
  const columns: Column<ManagedAirline>[] = [
    {
      key: "brand",
      title: "Hãng hàng không",
      sort: "NAME",
      cell: (a) => (
        <div className="ad-airline-identity">
          <AirlineMark
            code={a.code}
            name={a.name}
            color={a.color}
            logoUrl={a.logoUrl ?? undefined}
            large
          />
          <div>
            <b>{a.name}</b>
            <small>IATA · {a.code}</small>
          </div>
        </div>
      ),
    },
    {
      key: "country",
      title: "Quốc gia",
      cell: (a) => (
        <>
          {a.country}
          <small>{a._count?.flights ?? 0} chuyến bay</small>
        </>
      ),
    },
    {
      key: "website",
      title: "Website chính thức",
      cell: (a) =>
        a.website ? (
          <a
            className="ad-external"
            href={a.website}
            target="_blank"
            rel="noreferrer"
          >
            {new URL(a.website).hostname}
            <AdminIcon name="arrow" />
          </a>
        ) : (
          <span className="ad-muted">Chưa cập nhật</span>
        ),
    },
    {
      key: "state",
      title: "Hoạt động",
      cell: (a) => (
        <Badge tone={a.isActive ? "green" : "neutral"}>
          {a.isActive ? "Đang hoạt động" : "Tạm ngừng"}
        </Badge>
      ),
    },
    {
      key: "date",
      title: "Cập nhật",
      cell: (a) => (
        <>
          {stamp(a.updatedAt)}
          <small>Ghi nhận {stamp(a.createdAt)}</small>
        </>
      ),
    },
    {
      key: "action",
      title: "Thao tác",
      cell: (a) => (
        <div className="ad-row-actions">
          <button
            className="ad-text-btn"
            onClick={() => edit({ type: "airline", data: a })}
          >
            Chỉnh sửa
          </button>
          <button
            className="ad-text-btn"
            onClick={() =>
              edit({
                type: "confirm",
                title: `${a.isActive ? "Ngừng" : "Kích hoạt lại"} ${a.name}? Việc ngừng hoạt động ảnh hưởng danh mục bán vé. Hãng còn đơn sắp bay sẽ được bảo vệ.`,
                action: () =>
                  mutate("patch", `/airlines/${a.id}/status`, {
                    isActive: !a.isActive,
                  }),
              })
            }
          >
            {a.isActive ? "Tạm ngừng" : "Kích hoạt"}
          </button>
          <button
            className="ad-text-btn danger"
            onClick={() =>
              edit({
                type: "confirm",
                title: `Xóa ${a.name}? Chỉ xóa hãng chưa có chuyến bay liên quan.`,
                action: () => mutate("delete", `/airlines/${a.id}`),
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
        eyebrow="AIRLINE MANAGEMENT"
        title="Những thương hiệu cất cánh."
        action={
          <button className="ad-btn" onClick={() => edit({ type: "airline" })}>
            <AdminIcon name="plus" />
            Thêm hãng bay
          </button>
        }
      >
        Quản lý nhận diện, thị trường và trạng thái hãng. Hãng mới xuất hiện
        trên danh mục khách hàng qua API.
      </PageTitle>
      <Panel>
        <SearchBar
          value={params.get("q") ?? ""}
          onChange={update}
          placeholder="Tên hãng, mã IATA hoặc quốc gia…"
        >
          <SalesFilter
            kind="active"
            value={params.get("status") ?? ""}
            update={update}
          />
        </SearchBar>
        <DataState {...state}>
          {state.data && (
            <>
              <DataTable
                items={state.data.items}
                columns={columns}
                label="Danh mục hãng hàng không"
                sort={params.get("sort") ?? "desc"}
                onSort={update}
              />
              <Paginator value={state.data.pagination} onChange={update} />
            </>
          )}
        </DataState>
      </Panel>
      <Notice>
        Dùng logo chính thức theo nhận diện thương hiệu. Xóa hãng đã có chuyến
        bay bị chặn; nên tạm ngừng để giữ lịch sử.
      </Notice>
    </>
  );
}
export function CustomersPage({
  query,
  revision,
  update,
  edit,
  mutate,
}: PageProps) {
  const state = useAdminData<Page<Customer>>(
      "/admin/customers",
      query,
      revision,
    ),
    params = new URLSearchParams(query);
  const columns: Column<Customer>[] = [
    {
      key: "name",
      title: "Khách hàng",
      sort: "NAME",
      cell: (u) => (
        <div className="ad-customer-cell">
          <span>
            {u.fullName
              .split(" ")
              .slice(-2)
              .map((s) => s[0])
              .join("")}
          </span>
          <div>
            <b>{u.fullName}</b>
            <small>#{String(u.id).padStart(4, "0")}</small>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      title: "Liên hệ đã che",
      cell: (u) => (
        <>
          {u.email}
          <small>{u.phone ?? "Chưa có số điện thoại"}</small>
        </>
      ),
    },
    {
      key: "role",
      title: "Quyền truy cập",
      cell: (u) => (
        <Badge tone={u.role === "ADMIN" ? "violet" : "blue"}>
          {u.role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
        </Badge>
      ),
    },
    {
      key: "bookings",
      title: "Đơn đặt vé",
      cell: (u) => (
        <Link className="ad-text-btn" to={"/admin/bookings?customerId=" + u.id}>
          {u._count.bookings} đơn ↗
        </Link>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      cell: (u) => (
        <Badge tone={u.isActive ? "green" : "red"}>
          {u.isActive ? "Đang hoạt động" : "Đã khóa"}
        </Badge>
      ),
    },
    {
      key: "joined",
      title: "Ngày tham gia",
      sort: "DATE",
      cell: (u) => stamp(u.createdAt),
    },
    {
      key: "action",
      title: "Thao tác",
      cell: (u) => (
        <div className="ad-row-actions">
          <button
            className="ad-text-btn"
            onClick={() =>
              edit({
                type: "confirm",
                title: `Đổi quyền ${u.fullName} thành ${u.role === "ADMIN" ? "khách hàng" : "quản trị viên"}? Các phiên hiện tại của tài khoản sẽ hết hiệu lực.`,
                action: () =>
                  mutate("patch", `/users/${u.id}`, {
                    role: u.role === "ADMIN" ? "USER" : "ADMIN",
                  }),
              })
            }
          >
            Đổi quyền
          </button>
          <button
            className="ad-text-btn danger"
            onClick={() =>
              edit({
                type: "confirm",
                title: `${u.isActive ? "Khóa" : "Mở khóa"} tài khoản ${u.fullName}?`,
                action: () =>
                  mutate("patch", `/users/${u.id}`, { isActive: !u.isActive }),
              })
            }
          >
            {u.isActive ? "Khóa" : "Mở khóa"}
          </button>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="CUSTOMER WORKSPACE"
        title="Mỗi khách hàng, một kết nối."
      >
        Danh mục tài khoản toàn hệ thống. Thông tin liên hệ đã được che; quyền
        quản trị được kiểm tra ở máy chủ.
      </PageTitle>
      <Panel>
        <SearchBar
          value={params.get("q") ?? ""}
          onChange={update}
          placeholder="Tìm họ tên hoặc email…"
        >
          <SalesFilter
            kind="active"
            value={params.get("status") ?? ""}
            update={update}
          />
        </SearchBar>
        <DataState {...state}>
          {state.data && (
            <>
              <DataTable
                items={state.data.items}
                columns={columns}
                label="Danh sách khách hàng và tài khoản"
                sort={params.get("sort") ?? "desc"}
                onSort={update}
              />
              <Paginator value={state.data.pagination} onChange={update} />
            </>
          )}
        </DataState>
      </Panel>
      <Notice>
        Không thể tự khóa hoặc đổi quyền tài khoản đang đăng nhập. Mọi thay đổi
        quyền và trạng thái đều được ghi nhật ký.
      </Notice>
      <MiniLink to="/admin/activity">Xem nhật ký truy cập quản trị</MiniLink>
    </>
  );
}
