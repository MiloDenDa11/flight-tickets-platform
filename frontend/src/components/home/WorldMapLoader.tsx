import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { WorldMapProps } from './WorldMap';
import { Alert, Spinner } from '../common';

export default function WorldMapLoader(props: WorldMapProps) {
  const [Map, setMap] = useState<ComponentType<WorldMapProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    const timer = window.setTimeout(() => {
      if (active) setFailed(true);
    }, 15000);

    import('./WorldMap')
      .then(module => {
        if (active) {
          setMap(() => module.default);
          setFailed(false);
        }
      })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => window.clearTimeout(timer));

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [attempt]);

  if (Map) return <Map {...props} />;
  return <div className="map-placeholder">{failed ? <div className="map-load-error">
    <Alert>Chưa tải được bản đồ. Vui lòng thử lại.</Alert>
    <button className="button small" onClick={() => setAttempt(value => value + 1)}>Tải lại bản đồ</button>
  </div> : <Spinner />}</div>;
}
