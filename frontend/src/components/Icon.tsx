const paths = {
  pause: 'M8 5v14M16 5v14',
  filter: 'M4 7h16M7 12h10M10 17h4M8 5v4m8 1v4m-4 1v4',
  search: 'm21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  northeast: 'M6 18 18 6M6 6h12v12',
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  swap: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  bag: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 6v14m8-14v14M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  shield: 'M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6L12 2Zm-4 10 3 3 5-6',
  clock: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  ticket: 'M3 7V4h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6Zm12-3v2m0 2v2m0 2v2m0 2v2',
  spark: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
  info: 'M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  seat: 'M6 3v8a4 4 0 0 0 4 4h8m-8-4h6a2 2 0 0 1 2 2v7m-8-5-3 5M3 11v3a5 5 0 0 0 5 5h8',
  mail: 'm3 5 9 7 9-7M3 4h18v16H3V4Z',
};
export type IconName = keyof typeof paths;
export default function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
