import { useState } from "react";
import AirlineMark from "../components/AirlineMark";
import { api, errorMessage } from "../services/api";
import { ManagedAirline } from "./types";
import AdminIcon from "./Icons";
export function AirlineForm({
  initial,
  busy,
  submit,
}: {
  initial?: ManagedAirline;
  busy: boolean;
  submit: (data: unknown) => Promise<void>;
}) {
  const [value, setValue] = useState({
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      country: initial?.country ?? "Việt Nam",
      logoUrl: initial?.logoUrl ?? "",
      website: initial?.website ?? "",
      color: initial?.color ?? "#087e83",
      isActive: initial?.isActive ?? true,
    }),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="ad-airline-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(value).catch(() => {});
      }}
    >
      <span className="ad-eyebrow">AIRLINE BRAND & PROFILE</span>
      <h2>{initial ? "Cập nhật hãng bay" : "Thêm hãng hàng không"}</h2>
      <p>
        Giữ đúng nhận diện thương hiệu. Dữ liệu hợp lệ được cập nhật qua API và
        hiển thị trên danh mục khách hàng.
      </p>
      <div className="ad-logo-preview">
        <AirlineMark
          code={value.code || "IATA"}
          name={value.name || "Xem trước logo"}
          color={value.color}
          logoUrl={value.logoUrl || undefined}
          large
        />
        <div>
          <b>{value.name || "Tên hãng hàng không"}</b>
          <span>
            {value.code || "Mã IATA"} · {value.country}
          </span>
          <small>Xem trước logo theo tỷ lệ gốc</small>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Mã IATA
          <input
            required
            pattern="[A-Z0-9]{2,3}"
            maxLength={3}
            value={value.code}
            onChange={(e) =>
              setValue({ ...value, code: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label>
          Tên hãng
          <input
            required
            minLength={2}
            maxLength={100}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label>
          Quốc gia
          <input
            required
            minLength={2}
            maxLength={100}
            value={value.country}
            onChange={(e) => setValue({ ...value, country: e.target.value })}
          />
        </label>
        <label>
          Website chính thức
          <input
            type="url"
            pattern="https://.*"
            placeholder="https://www.airline.com"
            maxLength={2048}
            value={value.website}
            onChange={(e) => setValue({ ...value, website: e.target.value })}
          />
        </label>
      </div>
      <label>
        Đường dẫn logo chính thức
        <input
          placeholder="URL HTTPS hoặc đường dẫn logo trong hệ thống"
          maxLength={2048}
          value={value.logoUrl}
          onChange={(e) => setValue({ ...value, logoUrl: e.target.value })}
        />
      </label>
      <div className="ad-upload-control">
        <label className="ad-upload">
          <AdminIcon name="download" />
          <span>
            {uploading ? "Đang tải logo…" : "Chọn ảnh PNG, JPEG hoặc WebP"}
            <small>Tối đa 2 MB · ưu tiên logo cắt gọn khoảng trống</small>
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError("");
              if (file.size > 2 * 1024 * 1024) {
                setError("Ảnh logo tối đa 2 MB.");
                return;
              }
              setUploading(true);
              try {
                const form = new FormData();
                form.append("logo", file);
                const result = await api.post("/admin/airlines/logo", form);
                setValue((current) => ({
                  ...current,
                  logoUrl: result.data.data.url,
                }));
              } catch (err) {
                setError(errorMessage(err));
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
        </label>
        <label className="ad-color-field">
          Màu nhận diện
          <input
            type="color"
            value={value.color}
            onChange={(e) => setValue({ ...value, color: e.target.value })}
          />
        </label>
      </div>
      {error && (
        <p className="ad-form-error" role="alert">
          {error}
        </p>
      )}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={value.isActive}
          onChange={(e) => setValue({ ...value, isActive: e.target.checked })}
        />
        Đang hoạt động và xuất hiện trong danh mục bán vé
      </label>
      <button className="ad-btn" disabled={busy || uploading}>
        <AdminIcon name="check" />
        {busy ? "Đang lưu…" : "Lưu hãng hàng không"}
      </button>
    </form>
  );
}
