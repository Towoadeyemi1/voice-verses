/** spirit's mark: a soft living light (still when motion is reduced). */
export const SpiritOrb = ({ size = 26, className = '' }: { size?: number; className?: string }) => (
  <span
    aria-hidden="true"
    className={`vv-spirit-orb inline-block rounded-full flex-none ${className}`}
    style={{
      width: size,
      height: size,
      background:
        'radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 32%), conic-gradient(from 0deg, #f0b44a, #f472b6, #8b5cf6, #2dd4bf, #f0b44a)',
      boxShadow: size > 40 ? '0 0 40px rgba(240,180,74,.35), 0 0 90px rgba(139,92,246,.25)' : '0 0 12px rgba(240,180,74,.35)',
    }}
  />
);
