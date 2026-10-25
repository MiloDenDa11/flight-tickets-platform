import { ReactNode, useEffect, useRef } from 'react';
export default function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { element.current?.classList.add('is-visible'); observer.disconnect(); }
    }, { threshold: .08 });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return <div className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }} ref={element}>{children}</div>;
}
