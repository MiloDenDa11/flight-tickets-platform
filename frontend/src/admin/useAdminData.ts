import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../services/api";
export function useAdminData<T>(
  path: string | null,
  query = "",
  revision = 0,
  poll = 0,
) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(Boolean(path)),
    [error, setError] = useState(""),
    [updatedAt, setUpdatedAt] = useState<Date | null>(null),
    [attempt, setAttempt] = useState(0);
  const lastKey = useRef("");
  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    const key = path + "?" + query;
    if (lastKey.current !== key) {
      setData(null);
      lastKey.current = key;
    }
    let alive = true,
      busy = false;
    const controller = new AbortController();
    const fetchData = async () => {
      if (busy) return;
      busy = true;
      setLoading(true);
      try {
        const response = await api.get<{ data: T }>(path, {
          params: new URLSearchParams(query),
          signal: controller.signal,
        });
        if (alive) {
          setData(response.data.data);
          setError("");
          setUpdatedAt(new Date());
        }
      } catch (e) {
        if (alive && !controller.signal.aborted) setError(errorMessage(e));
      } finally {
        busy = false;
        if (alive) setLoading(false);
      }
    };
    void fetchData();
    const timer = poll
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") void fetchData();
        }, poll)
      : undefined;
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [path, query, revision, attempt, poll]);
  return {
    data,
    loading,
    error,
    updatedAt,
    retry: useCallback(() => setAttempt((v) => v + 1), []),
  };
}
export function localToday() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}
export function flightLink(flight: { id: number; departureTime: string }) {
  const day = new Date(Date.parse(flight.departureTime) + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  return (
    "/admin/flights?" +
    new URLSearchParams({ flightId: String(flight.id), start: day, end: day })
  );
}
export function dateRange() {
  const day = localToday(),
    now = new Date(day + "T00:00:00Z");
  return {
    start: day.slice(0, 8) + "01",
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10),
  };
}
export function stamp(value: string | Date | null | undefined, withDay = true) {
  if (!value) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    ...(withDay ? { day: "2-digit", month: "2-digit" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function amount(
  value: number | null,
  currency = "VND",
  compact = false,
) {
  if (value === null) return "Chờ đối soát";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value);
}
export async function downloadCsv(
  path: string,
  query: string,
  filename: string,
) {
  const response = await api.get(path, {
    params: new URLSearchParams(query),
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
