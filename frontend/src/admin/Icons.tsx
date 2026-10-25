const paths = {
  dashboard: "M3 3h7v7H3zm11 0h7v4h-7zM3 14h7v7H3zm11-3h7v10h-7z",
  flights: "m22 2-7 20-4-9-9-4 20-7ZM11 13l5-5",
  fares: "M3 17l6-6 4 4 8-11M15 4h6v6M3 21h18",
  bookings:
    "M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3",
  customers:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  airlines: "M3 21h18M5 21V7l7-4 7 4v14M9 8h1m4 0h1M9 12h1m4 0h1M10 21v-5h4v5",
  revenue: "M3 3v18h18M7 16v-5m5 5V7m5 9v-9",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-2-6h4l1 3 3 1 3 1 1 4-2 2-1 3-1 3-4 1-2-2-3-1-3-1-1-4 2-2 1-3 1-3Z",
  airports: "M3 21h18M4 21V9h16v12M8 9V3h8v6M8 13h1m6 0h1M8 17h1m6 0h1",
  reviews: "M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4ZM8 11h8m-8-4h5",
  search: "m21 21-5-5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12a2 2 0 0 0 4 0",
  chevron: "m9 5 7 7-7 7",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "m6 6 12 12M6 18 18 6",
  sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z",
  refresh: "M20 7V3l-4 1M4 17v4l4-1M20 7A9 9 0 0 0 4 7m0 10a9 9 0 0 0 16 0",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  plus: "M12 5v14M5 12h14",
  shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Zm-4 10 3 3 5-6",
  clock: "M12 7v6l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  globe:
    "M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Zm9 9a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  logout: "M9 3H4v18h5m5-5 4-4-4-4m-5 4h13",
  check: "m5 12 4 4L19 6",
  activity: "M3 12h4l3-9 4 18 3-9h4",
};
export type AdminIconName = keyof typeof paths;
export default function AdminIcon({
  name,
  className = "",
}: {
  name: AdminIconName;
  className?: string;
}) {
  return (
    <svg
      className={"ad-icon " + className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
