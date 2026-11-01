import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';

export default function GlobeExperience() {
  const host = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'fallback' | 'ready'>('fallback');
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  pause.current = paused;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const small = window.matchMedia('(max-width: 767px)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let generation = 0;
    const controller = new AbortController();
    async function initialize() {
      const current = ++generation;
      cleanup?.(); cleanup = undefined;
      setPhase('fallback');
      if (motion.matches || small.matches || connection?.saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) return;
      try {
        const { createGlobe } = await import('./createGlobe');
        if (disposed || current !== generation) return;
        const release = await createGlobe(element!, { paused: () => pause.current, signal: controller.signal, onFailure: () => { if (!disposed && current === generation) setPhase('fallback'); } });
        if (disposed || current !== generation) { release(); return; }
        cleanup = release;
        setPhase('ready');
      } catch { if (!disposed && current === generation) setPhase('fallback'); }
    }
    // Let the image, heading and search controls paint before loading WebGL.
    const timer = window.setTimeout(() => void initialize(), 500);
    motion.addEventListener('change', initialize);
    small.addEventListener('change', initialize);
    return () => { disposed = true; generation++; controller.abort(); clearTimeout(timer); motion.removeEventListener('change', initialize); small.removeEventListener('change', initialize); cleanup?.(); };
  }, []);

  return <div className={`hero-world ${phase}`}>
    <div className="hero-world-orbit" aria-hidden="true" />
    <div className="hero-globe-fallback" aria-hidden="true"><img src="/images/globe-fallback.svg" width="520" height="520" alt="" /></div>
    <div ref={host} className="hero-globe-canvas" aria-hidden="true" />
    <div className="hero-world-label"><span className="world-label-line" />KHÔNG BIÊN GIỚI. VẠN KHẢ NĂNG.</div>
    <div className="hero-world-bottom"><span>Địa cầu & đường bay minh họa</span>{phase === 'ready' && <button type="button" aria-label={paused ? 'Tiếp tục chuyển động địa cầu' : 'Tạm dừng chuyển động địa cầu'} aria-pressed={paused} onClick={() => setPaused(value => !value)}><Icon name={paused ? 'globe' : 'pause'} />{paused ? 'Tiếp tục' : 'Tạm dừng'}</button>}</div>
  </div>;
}
