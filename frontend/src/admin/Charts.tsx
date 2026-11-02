import { useEffect, useId, useRef, useState } from "react";
import { amount } from "./useAdminData";
import { AirlineRevenue } from "./types";
import { EmptyState } from "./ui";
type Point = { date: string; [key: string]: string | number };
type Metric = { key: string; label: string; color: string };
function shortDate(date: string) {
  return date.slice(8, 10) + "/" + date.slice(5, 7);
}
export function LineChart({
  points,
  metrics,
  currency = "VND",
  numeric = false,
  hasObservations,
  emptyMessage = "Chưa có giao dịch thành công trong kỳ này.",
}: {
  points: Point[];
  metrics: Metric[];
  currency?: string;
  numeric?: boolean;
  hasObservations?: boolean;
  emptyMessage?: string;
}) {
  const id = useId().replace(/:/g, ""),
    [active, setActive] = useState<number | null>(null),
    [hidden, setHidden] = useState<string[]>([]),
    [width, setWidth] = useState(700);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(250, Math.round(entries[0].contentRect.width))),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const visible = metrics.filter((m) => !hidden.includes(m.key));
  const max = Math.max(
    1,
    ...points.flatMap((p) => visible.map((m) => Number(p[m.key]) || 0)),
  );
  const hasData =
    points.length > 0 &&
    (hasObservations ??
      points.some((p) => metrics.some((m) => Number(p[m.key]) > 0)));
  const W = width,
    H = width < 400 ? 250 : 280,
    L = 76,
    R = 16,
    T = 18,
    B = 38;
  const x = (i: number) =>
      L + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - L - R),
    y = (v: number) => H - B - (v / max) * (H - T - B);
  const format = (v: number) =>
    numeric ? v.toLocaleString("vi-VN") : amount(v, currency, true);
  const tickCount = Math.min(
    points.length,
    Math.max(2, Math.floor((W - L - R) / 65)),
  );
  const ticks = new Set(
    Array.from({ length: tickCount }, (_, i) =>
      Math.round((i * (points.length - 1)) / (tickCount - 1 || 1)),
    ),
  );
  return (
    <div className="ad-line-chart" ref={container}>
      <div className="ad-chart-legend">
        {metrics.map((m) => (
          <button
            key={m.key}
            aria-pressed={!hidden.includes(m.key)}
            className={hidden.includes(m.key) ? "inactive" : ""}
            onClick={() =>
              setHidden((s) =>
                s.includes(m.key)
                  ? s.filter((k) => k !== m.key)
                  : s.length < metrics.length - 1
                    ? [...s, m.key]
                    : s,
              )
            }
          >
            <i style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>
      {!hasData ? (
        <EmptyState title="Chưa có dữ liệu trong kỳ">{emptyMessage}</EmptyState>
      ) : (
        <div className="ad-chart-canvas">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="group"
            aria-label={
              metrics.map((m) => m.label).join(", ") +
              " theo thời gian. Dùng phím mũi tên trái / phải để xem các mốc."
            }
            onMouseLeave={(event) => {
              const focused = event.currentTarget.querySelector<SVGRectElement>(
                "rect[data-point]:focus",
              );
              setActive(focused ? Number(focused.dataset.point) : null);
            }}
          >
            <defs>
              {visible.map((m) => (
                <linearGradient
                  key={m.key}
                  id={id + m.key}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={m.color} stopOpacity=".22" />
                  <stop offset="100%" stopColor={m.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((r) => (
              <g key={r}>
                <line
                  x1={L}
                  x2={W - R}
                  y1={y(max * r)}
                  y2={y(max * r)}
                  stroke="var(--ad-line)"
                  strokeDasharray="3 5"
                />
                <text x={L - 12} y={y(max * r) + 4} textAnchor="end">
                  {format(Math.round(max * r))}
                </text>
              </g>
            ))}
            {points.map((p, i) =>
              ticks.has(i) ? (
                <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle">
                  {shortDate(p.date)}
                </text>
              ) : null,
            )}
            {visible.map((m) => {
              const line = points
                .map(
                  (p, i) =>
                    `${i ? "L" : "M"}${x(i)},${y(Number(p[m.key]) || 0)}`,
                )
                .join(" ");
              return (
                <g key={m.key}>
                  <path
                    d={
                      line +
                      ` L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z`
                    }
                    fill={`url(#${id + m.key})`}
                  />
                  <path
                    className="ad-chart-path"
                    d={line}
                    fill="none"
                    stroke={m.color}
                    strokeWidth="2.6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {points.length === 1 && (
                    <circle
                      cx={x(0)}
                      cy={y(Number(points[0][m.key]))}
                      r="5"
                      fill={m.color}
                    />
                  )}
                </g>
              );
            })}
            {points.map((p, i) => (
              <rect
                key={p.date}
                x={Math.max(
                  L,
                  x(i) - (W - L - R) / Math.max(points.length - 1, 1) / 2,
                )}
                y={T}
                width={
                  Math.min(
                    W - R,
                    x(i) + (W - L - R) / Math.max(points.length - 1, 1) / 2,
                  ) -
                  Math.max(
                    L,
                    x(i) - (W - L - R) / Math.max(points.length - 1, 1) / 2,
                  )
                }
                height={H - T - B}
                fill="transparent"
                tabIndex={active === i || (active === null && i === 0) ? 0 : -1}
                role="button"
                data-point={i}
                aria-label={
                  p.date +
                  ": " +
                  visible
                    .map((m) => m.label + " " + format(Number(p[m.key])))
                    .join(", ")
                }
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const index = Math.max(
                      0,
                      Math.min(
                        points.length - 1,
                        i + (e.key === "ArrowRight" ? 1 : -1),
                      ),
                    );
                    e.currentTarget.parentNode
                      ?.querySelectorAll<SVGRectElement>('rect[role="button"]')
                      [index]?.focus();
                  }
                }}
              />
            ))}
            {active !== null && points[active] && (
              <g pointerEvents="none">
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={T}
                  y2={H - B}
                  stroke="var(--ad-muted)"
                  strokeDasharray="4 4"
                />
                {visible.map((m) => (
                  <circle
                    key={m.key}
                    cx={x(active)}
                    cy={y(Number(points[active][m.key]))}
                    r="4.5"
                    fill={m.color}
                    stroke="var(--ad-surface)"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}
          </svg>
          {active !== null && points[active] && (
            <div className="ad-chart-tooltip" role="status">
              <b>{points[active].date}</b>
              {visible.map((m) => (
                <span key={m.key}>
                  <i style={{ background: m.color }} />
                  {m.label}
                  <strong>
                    {numeric
                      ? Number(points[active][m.key]).toLocaleString("vi-VN")
                      : amount(Number(points[active][m.key]), currency)}
                  </strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export function AirlineChart({
  items,
  currency = "VND",
  mode = "bar",
}: {
  items: AirlineRevenue[];
  currency?: string;
  mode?: "bar" | "donut";
}) {
  const total = items.reduce((s, a) => s + a.gross, 0),
    max = Math.max(...items.map((a) => a.gross), 1);
  const [active, setActive] = useState<number | null>(null);
  if (!total)
    return (
      <EmptyState title="Chưa phát sinh doanh thu theo hãng">
        Biểu đồ sẽ xuất hiện khi có giao dịch thanh toán thành công.
      </EmptyState>
    );
  let offset = 0;
  return (
    <div className={"ad-airline-chart " + mode}>
      {mode === "donut" && (
        <div className="ad-donut">
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label="Tỷ trọng doanh thu theo hãng"
          >
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="var(--ad-subtle)"
              strokeWidth="18"
            />
            {items.map((a) => {
              const size = (a.gross / total) * 100,
                start = offset;
              offset += size;
              return (
                <circle
                  key={a.id}
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke={a.color}
                  strokeWidth={active === a.id ? 23 : 18}
                  pathLength="100"
                  strokeDasharray={`${size} ${100 - size}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 80 80)"
                  onMouseEnter={() => setActive(a.id)}
                  onMouseLeave={() => setActive(null)}
                >
                  <title>
                    {a.name}: {size.toFixed(1)}% · {amount(a.gross, currency)}
                  </title>
                </circle>
              );
            })}
          </svg>
          <div>
            <small>
              {active
                ? items.find((a) => a.id === active)?.code
                : "Tổng thực thu"}
            </small>
            <strong>
              {amount(
                active ? items.find((a) => a.id === active)!.gross : total,
                currency,
                true,
              )}
            </strong>
          </div>
        </div>
      )}
      <div className="ad-airline-bars">
        {items.map((a) => (
          <button
            key={a.id}
            onFocus={() => setActive(a.id)}
            onBlur={() => setActive(null)}
            onMouseEnter={() => setActive(a.id)}
            onMouseLeave={() => setActive(null)}
            className={active === a.id ? "active" : ""}
            aria-label={`${a.name}: ${amount(a.gross, currency)}, ${a.tickets} vé`}
          >
            <div>
              <span>
                <i style={{ background: a.color }} />
                {a.name}
              </span>
              <b>
                {mode === "donut"
                  ? ((a.gross / total) * 100).toFixed(1) + "%"
                  : amount(a.gross, currency, true)}
              </b>
            </div>
            {mode === "bar" && (
              <div className="ad-bar-track">
                <i
                  style={{
                    width: (a.gross / max) * 100 + "%",
                    background: a.color,
                  }}
                />
              </div>
            )}
            <small>
              {a.tickets.toLocaleString("vi-VN")} vé ·{" "}
              {amount(a.gross, currency)}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}
