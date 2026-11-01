import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Airline, Airport } from "../types";
import { api, errorMessage } from "../services/api";
import { useDialogFocus } from "../components/useDialogFocus";
import Shell from "./Shell";
import Dashboard from "./Dashboard";
import {
  AirlinesPage,
  BookingDetail,
  BookingsPage,
  CustomersPage,
  Editing,
  FlightsPage,
  Mutation,
} from "./ManagementPages";
import { FaresPage, RevenuePage } from "./AnalyticsPages";
import { ActivityPage, LegacyDirectory, SettingsPage } from "./SettingsPages";
import { AirlineForm } from "./AirlineForm";
import { AirportForm, FareForm, FlightForm } from "./Forms";
import { SyncStatus } from "./types";
import { useAdminData } from "./useAdminData";
import AdminIcon from "./Icons";
import { Filters } from "./ui";
import "../styles/admin-workspace.css";
import "../styles/admin-redesign.css";
const sections = [
  "dashboard",
  "flights",
  "fares",
  "bookings",
  "customers",
  "airlines",
  "revenue",
  "airports",
  "reviews",
  "settings",
  "activity",
];
export default function AdminWorkspace() {
  const { section: routeSection = "dashboard" } = useParams(),
    section =
      routeSection === "users"
        ? "customers"
        : sections.includes(routeSection)
          ? routeSection
          : "dashboard";
  const [params, setParams] = useSearchParams(),
    [revision, setRevision] = useState(0),
    [editing, setEditing] = useState<Editing | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [theme, setTheme] = useState(() => {
      try {
        return localStorage.getItem("flight-admin-theme") === "dark"
          ? "dark"
          : "light";
      } catch {
        return "light";
      }
    });
  const airports = useAdminData<Airport[]>("/admin/airports", "", revision),
    airlines = useAdminData<Airline[]>("/admin/airlines", "", revision),
    sync = useAdminData<SyncStatus>("/admin/sync/status", "", revision, 30000);
  const query = params.toString();
  function update(values: Record<string, string | number | undefined>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (!("page" in values)) next.delete("page");
      if (
        Object.keys(values).some((key) =>
          [
            "start",
            "end",
            "airlineId",
            "origin",
            "destination",
            "region",
            "q",
            "status",
            "departureDate",
          ].includes(key),
        )
      ) {
        if (!("flightId" in values)) next.delete("flightId");
        if (!("fareId" in values)) next.delete("fareId");
      }
      Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    });
  }
  const close = () => {
    if (busy) return;
    setEditing(null);
    setError("");
    if (params.has("bookingId")) update({ bookingId: undefined });
  };
  useDialogFocus(Boolean(editing), close, busy);
  useEffect(() => {
    try {
      localStorage.setItem("flight-admin-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    setEditing(null);
    setError("");
    setMessage("");
  }, [section]);
  useEffect(() => {
    const id = params.get("bookingId");
    if (id && section === "bookings") setEditing({ type: "booking", id });
  }, [query, section]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const mutate: Mutation = async (method, path, data) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.request({ method, url: "/admin" + path, data });
      setEditing(null);
      setRevision((v) => v + 1);
      setMessage(
        path.startsWith("/sync/")
          ? "Đã nhận yêu cầu đồng bộ. Theo dõi kết quả trong tiến trình bên dưới."
          : "Đã cập nhật dữ liệu thành công.",
      );
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const props = {
    query,
    revision,
    update,
    edit: (value: Editing) => {
      setError("");
      setEditing(value);
    },
    mutate,
  };
  return (
    <Shell
      section={section}
      theme={theme}
      setTheme={setTheme}
      sync={sync.data}
      syncError={sync.error}
      refresh={() => setRevision((v) => v + 1)}
    >
      {message && (
        <div className="ad-toast" role="status">
          <AdminIcon name="check" />
          {message}
          <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
            <AdminIcon name="close" />
          </button>
        </div>
      )}
      {error && !editing && (
        <div className="ad-notice warning" role="alert">
          {error}
          <button onClick={() => setError("")}>Đóng</button>
        </div>
      )}
      {["dashboard", "flights", "fares", "bookings", "revenue"].includes(
        section,
      ) && (
        <Filters
          params={params}
          update={update}
          airports={airports.data ?? []}
          airlines={airlines.data ?? []}
        />
      )}
      <div className="ad-route-content" key={section}>
        {section === "dashboard" && (
          <Dashboard {...props} airlines={airlines.data ?? []} />
        )}{" "}
        {section === "flights" && <FlightsPage {...props} />}{" "}
        {section === "fares" && <FaresPage {...props} />}{" "}
        {section === "bookings" && <BookingsPage {...props} />}{" "}
        {section === "customers" && <CustomersPage {...props} />}{" "}
        {section === "airlines" && <AirlinesPage {...props} />}{" "}
        {section === "revenue" && <RevenuePage {...props} />}{" "}
        {(section === "airports" || section === "reviews") && (
          <LegacyDirectory {...props} resource={section} />
        )}{" "}
        {section === "activity" && <ActivityPage {...props} />}{" "}
        {section === "settings" && (
          <SettingsPage
            revision={revision}
            mutate={mutate}
            theme={theme}
            setTheme={setTheme}
            sync={sync.data}
          />
        )}
      </div>
      {editing && (
        <div className="ad-modal-backdrop" onClick={close}>
          <section
            className="modal ad-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={
              editing.type === "booking"
                ? "Chi tiết đơn đặt vé"
                : "Cập nhật dữ liệu quản trị"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="ad-dialog-close ad-icon-btn"
              aria-label="Đóng hộp thoại"
              disabled={busy}
              onClick={close}
            >
              <AdminIcon name="close" />
            </button>
            {error && (
              <div className="ad-notice warning" role="alert">
                {error}
              </div>
            )}
            {editing.type === "airport" && (
              <AirportForm
                initial={editing.data}
                busy={busy}
                submit={(data) =>
                  mutate(
                    editing.data ? "put" : "post",
                    "/airports" + (editing.data ? "/" + editing.data.id : ""),
                    data,
                  )
                }
              />
            )}{" "}
            {editing.type === "airline" && (
              <AirlineForm
                initial={editing.data}
                busy={busy}
                submit={(data) =>
                  mutate(
                    editing.data ? "put" : "post",
                    "/airlines" + (editing.data ? "/" + editing.data.id : ""),
                    data,
                  )
                }
              />
            )}{" "}
            {editing.type === "flight" && (
              <FlightForm
                busy={busy}
                submit={(data) => mutate("post", "/flights", data)}
              />
            )}{" "}
            {editing.type === "fare" && (
              <FareForm
                initial={editing.data}
                busy={busy}
                submit={(data) =>
                  mutate("patch", "/fares/" + editing.data.id, data)
                }
              />
            )}{" "}
            {editing.type === "booking" && <BookingDetail id={editing.id} />}{" "}
            {editing.type === "confirm" && (
              <div className="ad-confirm">
                <span className="ad-confirm-icon">
                  <AdminIcon name="shield" />
                </span>
                <span className="ad-eyebrow">CONFIRM ADMIN ACTION</span>
                <h2>Xác nhận thay đổi</h2>
                <p>{editing.title}</p>
                <div>
                  <button
                    className="ad-btn secondary"
                    disabled={busy}
                    onClick={close}
                  >
                    Quay lại
                  </button>
                  <button
                    className="ad-btn"
                    disabled={busy}
                    onClick={() => void editing.action().catch(() => {})}
                  >
                    {busy ? "Đang xử lý…" : "Xác nhận"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </Shell>
  );
}
