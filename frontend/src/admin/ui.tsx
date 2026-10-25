import { ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Airline, Airport } from "../types";
import { FilterUpdate, Pagination } from "./types";
import { amount, dateRange } from "./useAdminData";
import AdminIcon, { AdminIconName } from "./Icons";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"ad-badge " + tone}>{children}</span>;
}
export const labels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
  PAID: "Đã thu",
  REFUNDED: "Đã hoàn",
  SCHEDULED: "Đang mở bán",
  COMPLETED: "Đóng bán",
  ON_TIME: "Đúng giờ",
  DELAYED: "Chậm chuyến",
  DEPARTED: "Đã cất cánh",
  LANDED: "Đã hạ cánh",
  DIVERTED: "Chuyển hướng",
  SUCCEEDED: "Thành công",
  PARTIAL: "Một phần",
  FAILED: "Thất bại",
  RUNNING: "Đang xử lý",
};
export function Status({ value }: { value: string | null | undefined }) {
  return (
    <Badge
      tone={
        value &&
        ["CONFIRMED", "PAID", "ON_TIME", "LANDED", "SUCCEEDED"].includes(value)
          ? "green"
          : value &&
              ["CANCELLED", "EXPIRED", "FAILED", "DIVERTED"].includes(value)
            ? "red"
            : value && ["PENDING", "DELAYED", "PARTIAL"].includes(value)
              ? "amber"
              : "blue"
      }
    >
      {value ? (labels[value] ?? value) : "Chưa có dữ liệu"}
    </Badge>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"ad-panel " + className}>
      {(title || action) && (
        <div className="ad-panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function EmptyState({
  title = "Chưa có dữ liệu phù hợp",
  children,
  action,
}: {
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ad-empty">
      <span>
        <AdminIcon name="activity" />
      </span>
      <h3>{title}</h3>
      <p>{children ?? "Thử đổi bộ lọc hoặc chọn khoảng thời gian khác."}</p>
      {action}
    </div>
  );
}
export function DataState({
  loading,
  error,
  data,
  retry,
  children,
}: {
  loading: boolean;
  error: string;
  data: unknown;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading && !data)
    return (
      <div className="ad-skeleton" role="status" aria-label="Đang tải dữ liệu">
        <span />
        <span />
        <span />
        <span />
        <i />
      </div>
    );
  if (error && !data)
    return (
      <Panel>
        <div className="ad-error" role="alert">
          <AdminIcon name="activity" />
          <h3>Chưa tải được dữ liệu</h3>
          <p>{error}</p>
          <button className="ad-btn" onClick={retry}>
            <AdminIcon name="refresh" />
            Thử lại
          </button>
        </div>
      </Panel>
    );
  return (
    <>
      {error && (
        <div className="ad-notice warning" role="alert">
          Dữ liệu đang hiển thị từ lần tải trước. {error}
          <button onClick={retry}>Thử lại</button>
        </div>
      )}
      {children}
    </>
  );
}
export function Notice({
  children,
  warning = false,
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <div className={"ad-notice " + (warning ? "warning" : "")}>
      <AdminIcon name={warning ? "activity" : "shield"} />
      <span>{children}</span>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ad-page-title">
      <div>
        <span className="ad-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
      {action}
    </div>
  );
}
export function Paginator({
  value,
  onChange,
}: {
  value: Pagination;
  onChange: FilterUpdate;
}) {
  return (
    <div className="ad-pagination">
      <span>
        <b>{value.total.toLocaleString("vi-VN")}</b> bản ghi · Trang{" "}
        {value.page}/{value.pages}
      </span>
      <label>
        Số dòng
        <select
          aria-label="Số dòng mỗi trang"
          value={value.pageSize}
          onChange={(e) => onChange({ pageSize: e.target.value })}
        >
          {[5, 10, 15, 25, 50, 100].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <button
        className="ad-icon-btn"
        aria-label="Trang trước"
        disabled={value.page <= 1}
        onClick={() =>
          onChange({ page: Math.min(value.pages, value.page - 1) })
        }
      >
        ←
      </button>
      <button
        className="ad-icon-btn"
        aria-label="Trang sau"
        disabled={value.page >= value.pages}
        onClick={() => onChange({ page: value.page + 1 })}
      >
        →
      </button>
    </div>
  );
}
export type Column<T> = {
  key: string;
  title: string;
  cell: (row: T) => ReactNode;
  sort?: string;
};
export function DataTable<T extends { id: string | number }>({
  items,
  columns,
  label,
  sort,
  onSort,
}: {
  items: T[];
  columns: Column<T>[];
  label: string;
  sort?: string;
  onSort?: FilterUpdate;
}) {
  return !items.length ? (
    <EmptyState />
  ) : (
    <div
      className="ad-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="ad-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>
                {c.sort && onSort ? (
                  <button
                    aria-label={`Sắp xếp ${c.title} ${sort === "asc" ? "giảm" : "tăng"} dần`}
                    onClick={() =>
                      onSort({
                        order: c.sort,
                        sort: sort === "asc" ? "desc" : "asc",
                      })
                    }
                  >
                    {c.title}
                    <span aria-hidden="true"> ↕</span>
                  </button>
                ) : (
                  c.title
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr
              key={row.id}
              style={
                {
                  "--row-delay": Math.min(i, 8) * 25 + "ms",
                } as React.CSSProperties
              }
            >
              {columns.map((c) => (
                <td key={c.key}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function SearchBar({
  value,
  onChange,
  placeholder = "Tìm mã, tên hoặc email…",
  children,
}: {
  value: string;
  onChange: FilterUpdate;
  placeholder?: string;
  children?: ReactNode;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="ad-table-tools">
      <form
        className="ad-local-search"
        onSubmit={(e) => {
          e.preventDefault();
          onChange({ q: text.trim() });
        }}
      >
        <AdminIcon name="search" />
        <input
          aria-label="Tìm trong bảng"
          placeholder={placeholder}
          maxLength={100}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!e.target.value) onChange({ q: "" });
          }}
        />
        <button type="submit">Tìm</button>
      </form>
      <div className="ad-tool-options">{children}</div>
    </div>
  );
}
export function Filters({
  params,
  update,
  airports,
  airlines,
}: {
  params: URLSearchParams;
  update: FilterUpdate;
  airports: Airport[];
  airlines: Airline[];
}) {
  const defaults = dateRange();
  return (
    <section className="ad-filters" aria-label="Bộ lọc dữ liệu">
      <div className="ad-filter-caption">
        <AdminIcon name="clock" />
        <span>BỘ LỌC DỮ LIỆU</span>
      </div>
      <label>
        Từ ngày
        <input
          type="date"
          value={params.get("start") ?? defaults.start}
          onChange={(e) => update({ start: e.target.value })}
        />
      </label>
      <label>
        Đến ngày
        <input
          type="date"
          value={params.get("end") ?? defaults.end}
          onChange={(e) => update({ end: e.target.value })}
        />
      </label>
      <label>
        Hãng hàng không
        <select
          value={params.get("airlineId") ?? ""}
          onChange={(e) => update({ airlineId: e.target.value })}
        >
          <option value="">Tất cả hãng bay</option>
          {airlines.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      {(["origin", "destination"] as const).map((key, i) => (
        <label key={key}>
          {i ? "Điểm đến" : "Điểm khởi hành"}
          <select
            value={params.get(key) ?? ""}
            onChange={(e) => update({ [key]: e.target.value })}
          >
            <option value="">Tất cả sân bay</option>
            {airports.map((a) => (
              <option key={a.id} value={a.code}>
                {a.code} · {a.city}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label>
        Khu vực
        <select
          value={params.get("region") ?? "ALL"}
          onChange={(e) => update({ region: e.target.value })}
        >
          <option value="ALL">Tất cả khu vực</option>
          <option value="DOMESTIC">Nội địa Việt Nam</option>
          <option value="INTERNATIONAL">Quốc tế</option>
        </select>
      </label>
      <button
        className="ad-clear"
        onClick={() =>
          update({
            start: undefined,
            end: undefined,
            airlineId: undefined,
            origin: undefined,
            destination: undefined,
            region: undefined,
            status: undefined,
            q: undefined,
            customerId: undefined,
            flightId: undefined,
            paymentStatus: undefined,
            fareId: undefined,
            departureDate: undefined,
            cabinClass: undefined,
            passengers: undefined,
          })
        }
      >
        Đặt lại
      </button>
    </section>
  );
}
export function GroupToggle({
  value,
  update,
}: {
  value: string;
  update: FilterUpdate;
}) {
  return (
    <div
      className="ad-segment"
      role="group"
      aria-label="Nhóm dữ liệu theo thời gian"
    >
      {[
        ["DAY", "Ngày"],
        ["WEEK", "Tuần"],
        ["MONTH", "Tháng"],
      ].map(([k, v]) => (
        <button
          key={k}
          aria-pressed={value === k}
          className={value === k ? "active" : ""}
          onClick={() => update({ group: k })}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
export function Count({
  value,
  money = false,
  currency = "VND",
}: {
  value: number;
  money?: boolean;
  currency?: string;
}) {
  const target = useRef(value),
    [shown, setShown] = useState(() =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? value : 0,
    );
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target.current);
      return;
    }
    let frame = 0,
      start = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - start) / 650, 1);
      setShown(Math.round(target.current * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (target.current !== value) {
      target.current = value;
      setShown(value);
    }
  }, [value]);
  return (
    <>{money ? amount(shown, currency, true) : shown.toLocaleString("vi-VN")}</>
  );
}
export function Kpi({
  label,
  value,
  icon,
  accent = "blue",
  money = false,
  currency = "VND",
  hint,
  delta,
  sparkline,
}: {
  label: string;
  value: number;
  icon: AdminIconName;
  accent?: string;
  money?: boolean;
  currency?: string;
  hint: string;
  delta?: number | null;
  sparkline?: number[];
}) {
  const max = Math.max(...(sparkline ?? []), 1);
  return (
    <article className={"ad-kpi " + accent}>
      <div className="ad-kpi-top">
        <span>{label}</span>
        <i>
          <AdminIcon name={icon} />
        </i>
      </div>
      <strong
        title={money ? amount(value, currency) : value.toLocaleString("vi-VN")}
      >
        <Count value={value} money={money} currency={currency} />
      </strong>
      <div className="ad-kpi-bottom">
        <small>
          {delta !== undefined && delta !== null ? (
            <b className={delta >= 0 ? "positive" : "negative"}>
              {delta >= 0 ? "↗" : "↘"} {Math.abs(delta)}% <em>so kỳ trước</em>
            </b>
          ) : (
            hint
          )}
        </small>
        {sparkline && sparkline.some(Boolean) && (
          <svg viewBox="0 0 90 28" aria-label="Xu hướng dữ liệu thực tế">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points={sparkline
                .map(
                  (v, i) =>
                    `${(i / (sparkline.length - 1 || 1)) * 88},${27 - (v / max) * 24}`,
                )
                .join(" ")}
            />
          </svg>
        )}
      </div>
    </article>
  );
}
export function MiniLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="ad-mini-link" to={to}>
      {children}
      <AdminIcon name="arrow" />
    </Link>
  );
}
