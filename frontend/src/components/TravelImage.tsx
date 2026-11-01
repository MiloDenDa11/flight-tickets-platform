import { ImgHTMLAttributes, useState } from 'react';

// Keep the layout and readable alternative text when an editorial asset fails.
export default function TravelImage({ alt = '', className = '', onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={`travel-image-fallback ${className}`} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}><span>{alt || 'Flight Tickets'}</span></span>;
  return <img {...props} alt={alt} className={className} onError={event => { setFailed(true); onError?.(event); }} />;
}
