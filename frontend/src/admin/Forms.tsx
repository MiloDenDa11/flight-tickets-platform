import { FormEvent, useState } from "react";
import { Airline, Airport, Fare } from "../types";
import { Alert, useResource } from "../components/common";
import { cabinName } from "../utils/format";
export function AirportForm({
  initial,
  busy,
  submit,
}: {
  initial?: Airport;
  busy: boolean;
  submit: (d: unknown) => Promise<void>;
}) {
  const [d, set] = useState({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "Việt Nam",
    timezone: initial?.timezone ?? "Asia/Ho_Chi_Minh",
    latitude: String(initial?.latitude ?? 0),
    longitude: String(initial?.longitude ?? 0),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit({
          ...d,
          latitude: +d.latitude,
          longitude: +d.longitude,
        }).catch(() => {});
      }}
    >
      <h2>{initial ? "Sửa sân bay" : "Thêm sân bay"}</h2>
      <div className="form-grid">
        {(
          [
            ["code", "Mã IATA (3 ký tự)"],
            ["name", "Tên sân bay"],
            ["city", "Thành phố"],
            ["country", "Quốc gia"],
            ["timezone", "Múi giờ IANA"],
            ["latitude", "Vĩ độ"],
            ["longitude", "Kinh độ"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              value={d[key]}
              maxLength={key === "code" ? 3 : 150}
              pattern={key === "code" ? "[A-Z]{3}" : undefined}
              onChange={(e) => set({ ...d, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <button className="button" disabled={busy}>
        Lưu sân bay
      </button>
    </form>
  );
}
function FareFields({
  value: d,
  change: set,
}: {
  value: Omit<Fare, "id" | "flightId" | "availableSeats">;
  change: (d: Omit<Fare, "id" | "flightId" | "availableSeats">) => void;
}) {
  return (
    <>
      <div className="form-grid">
        {(
          [
            ["basePrice", "Giá gốc (VND)"],
            ["tax", "Thuế & phí (VND)"],
            ["baggageKg", "Ký gửi (kg)"],
            ["cabinBaggageKg", "Xách tay (kg)"],
            ["totalSeats", "Tổng số ghế"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              type="number"
              min={key === "totalSeats" ? 1 : 0}
              max={
                key === "totalSeats"
                  ? 600
                  : key === "baggageKg"
                    ? 60
                    : key === "cabinBaggageKg"
                      ? 20
                      : 100000000
              }
              value={d[key]}
              onChange={(e) => set({ ...d, [key]: +e.target.value })}
            />
          </label>
        ))}
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={d.refundable}
          onChange={(e) => set({ ...d, refundable: e.target.checked })}
        />
        Cho phép hoàn tiền trước giờ bay (demo)
      </label>
    </>
  );
}
export function FareForm({
  initial,
  busy,
  submit,
}: {
  initial: Fare;
  busy: boolean;
  submit: (d: unknown) => Promise<void>;
}) {
  const [d, set] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const {
          id: _id,
          flightId: _flight,
          availableSeats: _available,
          ...data
        } = d;
        void submit(data).catch(() => {});
      }}
    >
      <h2>{cabinName(d.cabinClass)} · Chỉnh giá & ghế</h2>
      <p>
        Đã giữ/đặt {initial.totalSeats - initial.availableSeats} ghế. Thay đổi
        giá chỉ áp dụng cho đơn mới.
      </p>
      <FareFields value={d} change={(v) => set({ ...d, ...v })} />
      <button className="button" disabled={busy}>
        Lưu hạng vé
      </button>
    </form>
  );
}
export function FlightForm({
  busy,
  submit,
}: {
  busy: boolean;
  submit: (d: unknown) => Promise<void>;
}) {
  const { data: airports } = useResource<Airport[]>("/admin/airports"),
    { data: airlines } = useResource<Airline[]>("/admin/airlines");
  const [d, set] = useState({
    airlineId: "",
    originId: "",
    destinationId: "",
    flightNumber: "",
    aircraft: "Airbus A321",
    departureTime: "",
    arrivalTime: "",
  });
  const [fares, setFares] = useState([
    {
      cabinClass: "ECONOMY",
      basePrice: 900000,
      tax: 385000,
      baggageKg: 0,
      cabinBaggageKg: 7,
      refundable: false,
      totalSeats: 120,
    },
  ]);
  const [localError, setError] = useState("");
  function send(e: FormEvent) {
    e.preventDefault();
    try {
      setError("");
      const data = {
        ...d,
        airlineId: +d.airlineId,
        originId: +d.originId,
        destinationId: +d.destinationId,
        departureTime: new Date(d.departureTime).toISOString(),
        arrivalTime: new Date(d.arrivalTime).toISOString(),
        fares,
      };
      void submit(data).catch(() => {});
    } catch {
      setError("Vui lòng kiểm tra thời gian bay.");
    }
  }
  return (
    <form onSubmit={send}>
      <h2>Tạo chuyến bay</h2>
      {localError && <Alert>{localError}</Alert>}
      <p className="muted">
        Thời gian nhập theo múi giờ máy tính; được chuyển thành UTC khi lưu.
      </p>
      <div className="form-grid">
        <label>
          Hãng hàng không
          <select
            required
            value={d.airlineId}
            onChange={(e) => set({ ...d, airlineId: e.target.value })}
          >
            <option value="">Chọn hãng</option>
            {airlines?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {(["originId", "destinationId"] as const).map((key, i) => (
          <label key={key}>
            {i ? "Sân bay đến" : "Sân bay đi"}
            <select
              required
              value={d[key]}
              onChange={(e) => set({ ...d, [key]: e.target.value })}
            >
              <option value="">Chọn sân bay</option>
              {airports?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.city}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Số hiệu chuyến
          <input
            required
            pattern="[A-Z0-9]{2,3}[0-9]{1,4}"
            maxLength={10}
            value={d.flightNumber}
            onChange={(e) => set({ ...d, flightNumber: e.target.value })}
            placeholder="VN1234"
          />
        </label>
        <label>
          Máy bay
          <input
            required
            maxLength={60}
            value={d.aircraft}
            onChange={(e) => set({ ...d, aircraft: e.target.value })}
          />
        </label>
        <label>
          Khởi hành
          <input
            required
            type="datetime-local"
            value={d.departureTime}
            onChange={(e) => set({ ...d, departureTime: e.target.value })}
          />
        </label>
        <label>
          Hạ cánh
          <input
            required
            type="datetime-local"
            value={d.arrivalTime}
            onChange={(e) => set({ ...d, arrivalTime: e.target.value })}
          />
        </label>
      </div>
      <h3>Hạng vé</h3>
      {fares.map((f, i) => (
        <fieldset key={i}>
          <legend>{cabinName(f.cabinClass)}</legend>
          <FareFields
            value={f}
            change={(v) => setFares(fares.map((a, j) => (j === i ? v : a)))}
          />
        </fieldset>
      ))}
      {fares.length < 3 && (
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setFares([
              ...fares,
              {
                ...fares[0],
                cabinClass: fares.length === 1 ? "PREMIUM" : "BUSINESS",
                basePrice: 3000000,
                baggageKg: 20,
                refundable: true,
                totalSeats: 16,
              },
            ])
          }
        >
          + Thêm {fares.length === 1 ? "phổ thông đặc biệt" : "thương gia"}
        </button>
      )}
      <button className="button full" disabled={busy}>
        Tạo chuyến bay
      </button>
    </form>
  );
}
