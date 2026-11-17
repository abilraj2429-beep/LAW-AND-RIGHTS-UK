import { useState } from 'react';
import { Scale } from 'lucide-react';

interface EditorialImageProps {
  src?: string;
  alt: string;
  aspectClass?: string;
  className?: string;
  fallbackLabel?: string;
}

export function EditorialImage({
  src,
  alt,
  aspectClass = 'aspect-[16/9]',
  className = '',
  fallbackLabel = 'Chambers Gazette Archive',
}: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${aspectClass} w-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 border border-slate-200 flex flex-col items-center justify-center px-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Scale className="w-6 h-6 text-slate-400 mb-2" strokeWidth={1.5} />
        <span className="text-xs font-medium tracking-wide text-slate-500">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover object-center transition-transform duration-500 ease-out"
      />
    </div>
  );
}
