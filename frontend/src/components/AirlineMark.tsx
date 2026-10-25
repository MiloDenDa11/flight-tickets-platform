import { useEffect, useState, type CSSProperties } from 'react';
type CardLogo = { file: string; layout: 'symbol' | 'wordmark' | 'stacked'; background: string };
type Manifest = Record<string, { file?: string; kind: string; card?: CardLogo }>;
let pending: Promise<Manifest> | null = null;
function load(): Promise<Manifest> {
  if (!pending) pending = fetch('/brands/manifest.json').then(async r => r.ok ? await r.json() as Manifest : {}).catch(() => ({}));
  return pending;
}
export default function AirlineMark({ code, name, color = '#087e83', large = false,logoUrl }: { code: string; name: string; color?: string; large?: boolean;logoUrl?:string }) {
  const [asset, setAsset] = useState<Manifest[string] | undefined>(), [failed, setFailed] = useState(false);
  useEffect(() => { let live = true; setFailed(false); load().then(data => { if (live) setAsset(data[code]); }); return () => { live = false; }; }, [code,logoUrl]);
  const card = large ? asset?.card : undefined;
  const file = logoUrl ?? card?.file ?? asset?.file;
  const imageUrl=file?.startsWith('/api/v1/media/')?new URL(file,new URL(import.meta.env.VITE_API_URL||'/api/v1',window.location.origin)).href:file;
  const custom=Boolean(logoUrl&&logoUrl!==card?.file);
  const style = { color, ...(card||custom ? { '--airline-logo-background': custom?color:card?.background } : {}) } as CSSProperties;
  return <span className={`airline-mark ${large ? 'large' : ''} ${asset?.kind === 'official-logo' ? 'wordmark' : ''} ${card ? `logo-${card.layout}` : ''}`} style={style}>
    {imageUrl && !failed ? <img src={imageUrl} alt={name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span aria-label={name}>{code}</span>}
  </span>;
}
