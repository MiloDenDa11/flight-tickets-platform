import { useEffect, useState } from 'react';
type Manifest = Record<string, { file?: string; kind: string }>;
let pending: Promise<Manifest> | null = null;
function load(): Promise<Manifest> {
  if (!pending) pending = fetch('/brands/manifest.json').then(async r => r.ok ? await r.json() as Manifest : {}).catch(() => ({}));
  return pending;
}
export default function AirlineMark({ code, name, color = '#087e83', large = false }: { code: string; name: string; color?: string; large?: boolean }) {
  const [asset, setAsset] = useState<Manifest[string] | undefined>(), [failed, setFailed] = useState(false);
  useEffect(() => { let live = true; setFailed(false); load().then(data => { if (live) setAsset(data[code]); }); return () => { live = false; }; }, [code]);
  return <span className={`airline-mark ${large ? 'large' : ''} ${asset?.kind === 'official-logo' ? 'wordmark' : ''}`} style={{ color }}>
    {asset?.file && !failed ? <img src={asset.file} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <span aria-label={name}>{code}</span>}
  </span>;
}
