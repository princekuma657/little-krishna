import type { ArtDirection } from '../types';

interface MediaProps {
  art: ArtDirection;
  label?: string;
  ratio?: string;
  className?: string;
}

/**
 * Neutral editorial placeholder surface. Database `art` swatches may carry
 * hue (olive-era data); the UI never renders those hues — dark surfaces stay
 * strictly neutral black/gray with the accent reserved for small details.
 */
export const NEUTRAL_ART = 'transparent';

export function Media({ art, label, ratio = '16 / 10', className = '' }: MediaProps) {
  return (
    <div
      className={`media ${className}`}
      style={{
        aspectRatio: ratio,
        background: NEUTRAL_ART,
      }}
      role="img"
      aria-label={label ?? 'Railway simulation imagery'}
    >
      {label ? <div className="media__label">{label}</div> : null}
    </div>
  );
}
