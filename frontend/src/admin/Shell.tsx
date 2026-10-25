import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, errorMessage } from "../services/api";
import { SyncStatus } from "./types";
import { Badge, EmptyState } from "./ui";
import { stamp, flightLink } from "./useAdminData";
import AdminIcon, { AdminIconName } from "./Icons";
type SearchResults = {
  flights: {
    id: number;
    flightNumber: string;
    departureTime: string;
    origin: { code: string };
    destination: { code: string };
  }[];
  bookings: { id: string; reference: string; user: { fullName: string } }[];
  airlines: { id: number; code: string; name: string }[];
};
const nav: {
  key: string;
  title: string;
  english: string;
  icon: AdminIconName;
}[] = [
  {
    key: "dashboard",
    title: "Tổng quan",
    english: "Overview",
    icon: "dashboard",
  },
  {
    key: "flights",
    title: "Chuyến bay",
    english: "Flight monitoring",
    icon: "flights",
  },
  {
    key: "fares",
    title: "Phân tích giá vé",
    english: "Fare intelligence",
    icon: "fares",
  },
  {
    key: "bookings",
    title: "Đơn đặt vé",
    english: "Booking operations",
    icon: "bookings",
  },
  {
    key: "customers",
    title: "Khách hàng",
    english: "Customer workspace",
    icon: "customers",
  },
  {
    key: "airlines",
    title: "Hãng hàng không",
    english: "Airline partners",
    icon: "airlines",
  },
  {
    key: "revenue",
    title: "Doanh thu & báo cáo",
    english: "Revenue reports",
    icon: "revenue",
  },
];
export default function Shell({
  section,
  theme,
  setTheme,
  sync,
  syncError,
  refresh,
  children,
}: {
  section: string;
  theme: string;
  setTheme: (value: string) => void;
  sync: SyncStatus | null;
  syncError: string;
  refresh: () => void;
  children: ReactNode;
}) {
  const { user, logout } = useAuth(),
    navigate = useNavigate();
  const [mobile, setMobile] = useState(false),
    [drop, setDrop] = useState<string | null>(null),
    [term, setTerm] = useState(""),
    [searched, setSearched] = useState(""),
    [results, setResults] = useState<SearchResults | null>(null),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState(""),
    [loggingOut, setLoggingOut] = useState(false);
  const topRef = useRef<HTMLElement>(null),
    menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function click(e: PointerEvent) {
      if (!topRef.current?.contains(e.target as Node)) setDrop(null);
    }
    function key(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        !document.querySelector('.ad-dialog[role="dialog"]')
      ) {
        setDrop(null);
        setMobile(false);
        if (document.querySelector(".ad-sidebar.open"))
          menuRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    setMobile(false);
    setDrop(null);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [section]);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(".ad-sidebar a"),
    );
    links[0]?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !links.length) return;
      if (e.shiftKey && document.activeElement === links[0]) {
        e.preventDefault();
        links[links.length - 1]?.focus();
      } else if (
        !e.shiftKey &&
        document.activeElement === links[links.length - 1]
      ) {
        e.preventDefault();
        links[0].focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = saved;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [mobile]);
  const errors = sync?.runs.filter((r) => r.status === "FAILED") ?? [],
    notConfigured = Boolean(sync?.kinds.some((k) => !k.configured));
  const sourceText = syncError
    ? "Kiểm tra kết nối"
    : !sync
      ? "Đang tải trạng thái"
      : sync.kinds.some((k) => k.lastSuccessAt)
        ? "Đã ghi nhận nguồn đối tác"
        : sync.kinds.some((k) => k.configured)
          ? "Đã cấu hình nguồn"
          : "Dữ liệu nội bộ · Demo";
  return (
    <div className="admin-app" data-theme={theme}>
      <a className="ad-skip" href="#admin-main">
        Đến nội dung quản trị
      </a>
      {mobile && (
        <button
          className="ad-nav-shade"
          aria-label="Đóng điều hướng"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={"ad-sidebar " + (mobile ? "open" : "")}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile || undefined}
        aria-label="Điều hướng quản trị"
      >
        <Link className="ad-brand" to="/admin">
          <span>
            <AdminIcon name="flights" />
          </span>
          <div>
            flight<span>TICKETS PLATFORM</span>
          </div>
          <i>ADMIN</i>
        </Link>
        <div className="ad-workspace-label">
          <span className="ad-workspace-avatar">
            <AdminIcon name="globe" />
          </span>
          <div>
            <b>Aviation workspace</b>
            <small>Không gian điều hành</small>
          </div>
          <span className="ad-status-dot" />
        </div>
        <div className="ad-nav-label">WORKSPACE</div>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.key}
              className={section === item.key ? "active" : ""}
              to={item.key === "dashboard" ? "/admin" : "/admin/" + item.key}
              onClick={() => setMobile(false)}
            >
              <AdminIcon name={item.icon} />
              <span>
                {item.title}
                <small>{item.english}</small>
              </span>
              {section === item.key && <i />}
            </Link>
          ))}
        </nav>
        <div className="ad-nav-label">ADMINISTRATION</div>
        <nav>
          {[
            ["airports", "Sân bay", "airports"],
            ["reviews", "Đánh giá", "reviews"],
            ["activity", "Nhật ký thao tác", "activity"],
            ["settings", "Cài đặt", "settings"],
          ].map(([key, title, icon]) => (
            <Link
              key={key}
              className={section === key ? "active compact" : "compact"}
              to={"/admin/" + key}
              onClick={() => setMobile(false)}
            >
              <AdminIcon name={icon as AdminIconName} />
              <span>{title}</span>
              {section === key && <i />}
            </Link>
          ))}
        </nav>
        <div className="ad-sidebar-bottom">
          <div className="ad-access-card">
            <AdminIcon name="shield" />
            <b>Quyền quản trị đã xác thực</b>
            <p>Truy cập theo vai trò. Dữ liệu định danh được bảo vệ.</p>
            <Link to="/admin/activity">
              Xem nhật ký <AdminIcon name="arrow" />
            </Link>
          </div>
          <Link className="ad-back-site" to="/">
            <AdminIcon name="globe" />
            Về trang đặt vé
            <AdminIcon name="arrow" />
          </Link>
          <small>FLIGHT TICKETS · OPERATIONS V1.0</small>
        </div>
      </aside>
      <div className="ad-workspace">
        <header className="ad-topbar" ref={topRef}>
          <div className="ad-topbar-start">
            <button
              ref={menuRef}
              className="ad-icon-btn ad-menu-toggle"
              aria-label="Mở điều hướng"
              aria-expanded={mobile}
              onClick={() => setMobile((v) => !v)}
            >
              <AdminIcon name="menu" />
            </button>
            <div className="ad-breadcrumb">
              Workspace
              <AdminIcon name="chevron" />
              <b>
                {nav.find((i) => i.key === section)?.title ??
                  (
                    {
                      settings: "Cài đặt",
                      activity: "Nhật ký thao tác",
                      airports: "Sân bay",
                      reviews: "Đánh giá",
                    } as Record<string, string>
                  )[section]}
              </b>
            </div>
          </div>
          <div className="ad-global-search-wrap">
            <form
              className="ad-global-search"
              role="search"
              onSubmit={async (e) => {
                e.preventDefault();
                if (term.trim().length < 2) return;
                setSearching(true);
                setSearchError("");
                setDrop("search");
                setSearched(term.trim());
                try {
                  const response = await api.get("/admin/search", {
                    params: { q: term.trim() },
                  });
                  setResults(response.data.data);
                } catch (error) {
                  setSearchError(errorMessage(error));
                  setResults(null);
                } finally {
                  setSearching(false);
                }
              }}
            >
              <button type="submit" aria-label="Tra cứu toàn hệ thống">
                <AdminIcon name="search" />
              </button>
              <input
                aria-label="Tìm chuyến bay, đơn vé, hãng"
                placeholder="Tìm chuyến bay, mã đơn, hãng…"
                minLength={2}
                maxLength={100}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            {drop === "search" && (
              <div className="ad-popover ad-search-results">
                <div className="ad-popover-title">
                  <b>Kết quả cho “{searched}”</b>
                  <button
                    className="ad-icon-btn"
                    aria-label="Đóng kết quả"
                    onClick={() => setDrop(null)}
                  >
                    <AdminIcon name="close" />
                  </button>
                </div>
                {searching ? (
                  <p>Đang tra cứu…</p>
                ) : searchError ? (
                  <p role="alert">{searchError}</p>
                ) : (
                  results && (
                    <>
                      {results.flights.map((f) => (
                        <Link
                          key={f.id}
                          onClick={() => setDrop(null)}
                          to={flightLink(f)}
                        >
                          <AdminIcon name="flights" />
                          <span>
                            <b>
                              {f.flightNumber} · {f.origin.code} →{" "}
                              {f.destination.code}
                            </b>
                            <small>Chuyến bay · {stamp(f.departureTime)}</small>
                          </span>
                          <AdminIcon name="chevron" />
                        </Link>
                      ))}
                      {results.bookings.map((b) => (
                        <Link
                          key={b.id}
                          onClick={() => setDrop(null)}
                          to={"/admin/bookings?bookingId=" + b.id}
                        >
                          <AdminIcon name="bookings" />
                          <span>
                            <b>{b.reference}</b>
                            <small>{b.user.fullName}</small>
                          </span>
                          <AdminIcon name="chevron" />
                        </Link>
                      ))}
                      {results.airlines.map((a) => (
                        <Link
                          key={a.id}
                          onClick={() => setDrop(null)}
                          to={"/admin/airlines?q=" + encodeURIComponent(a.code)}
                        >
                          <AdminIcon name="airlines" />
                          <span>
                            <b>{a.name}</b>
                            <small>Hãng hàng không · {a.code}</small>
                          </span>
                          <AdminIcon name="chevron" />
                        </Link>
                      ))}
                      {!results.flights.length &&
                        !results.bookings.length &&
                        !results.airlines.length && (
                          <EmptyState title="Không tìm thấy kết quả">
                            Thử số hiệu chuyến, mã đặt vé, tên khách hoặc tên
                            hãng.
                          </EmptyState>
                        )}
                    </>
                  )
                )}
              </div>
            )}
          </div>
          <div className="ad-topbar-tools">
            <Link
              to="/admin/settings"
              className={"ad-source-status " + (syncError ? "error" : "")}
            >
              <i
                className={
                  "ad-status-dot " +
                  (!sync ||
                  syncError ||
                  notConfigured ||
                  sync.kinds.some((k) => k.lastError)
                    ? "amber"
                    : "")
                }
              />
              <span>{sourceText}</span>
            </Link>
            <button
              className="ad-icon-btn ad-refresh"
              aria-label="Tải lại dữ liệu"
              title="Tải lại dữ liệu"
              onClick={refresh}
            >
              <AdminIcon name="refresh" />
            </button>
            <button
              className="ad-icon-btn"
              aria-label={
                theme === "dark"
                  ? "Chuyển giao diện sáng"
                  : "Chuyển giao diện tối"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <AdminIcon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <div className="ad-dropdown-wrap">
              <button
                className="ad-icon-btn ad-notifications-btn"
                aria-label="Thông báo và kết nối"
                aria-expanded={drop === "notifications"}
                onClick={() =>
                  setDrop(drop === "notifications" ? null : "notifications")
                }
              >
                <AdminIcon name="bell" />
                {(errors.length > 0 || notConfigured) && <i />}
              </button>
              {drop === "notifications" && (
                <div className="ad-popover ad-notifications">
                  <div className="ad-popover-title">
                    <b>Trung tâm thông báo</b>
                    <Badge tone="blue">Hệ thống</Badge>
                  </div>
                  {syncError && <p role="alert">{syncError}</p>}
                  {notConfigured && (
                    <Link to="/admin/settings" onClick={() => setDrop(null)}>
                      <span className="ad-notification-icon">
                        <AdminIcon name="globe" />
                      </span>
                      <div>
                        <b>Chưa cấu hình đủ nguồn đối tác</b>
                        <small>
                          Lịch bay, khai thác và giá vé có cấu hình riêng.
                        </small>
                      </div>
                    </Link>
                  )}
                  {errors.slice(0, 4).map((r) => (
                    <Link
                      key={r.id}
                      to="/admin/settings"
                      onClick={() => setDrop(null)}
                    >
                      <span className="ad-notification-icon danger">
                        <AdminIcon name="activity" />
                      </span>
                      <div>
                        <b>Đồng bộ {r.kind} chưa thành công</b>
                        <small>
                          {r.errorCode} · {stamp(r.finishedAt)}
                        </small>
                      </div>
                    </Link>
                  ))}
                  {!notConfigured && !errors.length && (
                    <EmptyState title="Chưa có cảnh báo từ đồng bộ">
                      Thông báo dựa trên kết quả thực tế của hệ thống.
                    </EmptyState>
                  )}
                  <Link
                    className="ad-popover-footer"
                    to="/admin/settings"
                    onClick={() => setDrop(null)}
                  >
                    Xem nguồn dữ liệu <AdminIcon name="arrow" />
                  </Link>
                </div>
              )}
            </div>
            <div className="ad-dropdown-wrap">
              <button
                className="ad-account"
                aria-label="Tài khoản quản trị"
                aria-expanded={drop === "account"}
                onClick={() => setDrop(drop === "account" ? null : "account")}
              >
                <span>
                  {user?.fullName
                    .split(" ")
                    .slice(-2)
                    .map((s) => s[0])
                    .join("")}
                </span>
                <div>
                  <b>{user?.fullName}</b>
                  <small>Quản trị viên</small>
                </div>
                <AdminIcon name="chevron" />
              </button>
              {drop === "account" && (
                <div className="ad-popover ad-account-menu">
                  <b>{user?.fullName}</b>
                  <small>{user?.email}</small>
                  <Link to="/profile">
                    <AdminIcon name="customers" />
                    Hồ sơ tài khoản
                  </Link>
                  <Link to="/admin/settings">
                    <AdminIcon name="settings" />
                    Cài đặt quản trị
                  </Link>
                  <button
                    disabled={loggingOut}
                    onClick={async () => {
                      setLoggingOut(true);
                      try {
                        await logout();
                        navigate("/login", { replace: true });
                      } catch {
                        setSearchError(
                          "Chưa đăng xuất được. Vui lòng thử lại.",
                        );
                      } finally {
                        setLoggingOut(false);
                      }
                    }}
                  >
                    <AdminIcon name="logout" />
                    {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
                  </button>
                  {searchError && <p role="alert">{searchError}</p>}
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="admin-main" className="ad-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="ad-footer">
          <span>
            FLIGHT TICKETS PLATFORM <i> / </i> AVIATION COMMAND CENTER
          </span>
          <span>
            <AdminIcon name="shield" />
            ADMIN WORKSPACE · UTC+7
          </span>
        </footer>
      </div>
    </div>
  );
}
