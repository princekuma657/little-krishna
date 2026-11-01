import type { ArtDirection } from '../types';

interface MediaProps {
  art: ArtDirection;
  label?: string;
  ratio?: string;
  className?: string;
}

export function Media({ art, label, ratio = '16 / 10', className = '' }: MediaProps) {
  return (
    <div
      className={`media ${className}`}
      style={{
        aspectRatio: ratio,
        background: `linear-gradient(140deg, ${art.from} 0%, ${art.to} 100%)`,
      }}
      role="img"
      aria-label={label ?? 'Railway simulation imagery'}
    >
      {art.accent ? <div style={{ position: 'absolute', inset: 0, background: art.accent, opacity: 0.14 }} /> : null}
      {label ? <div className="media__label">{label}</div> : null}
    </div>
  );
}
