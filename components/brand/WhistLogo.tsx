import type { SVGProps } from "react";

type WhistLogoProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

/** Playing-card mark: gold W + spade on felt — used in the app header and favicon. */
export function WhistLogo({ title = "WhisT", className, ...props }: WhistLogoProps) {
  const uid = "whist-logo";

  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      direction="ltr"
      className={className}
      {...props}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`${uid}-felt`} x1="64" y1="8" x2="64" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a5233" />
          <stop offset="1" stopColor="#0d2818" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="64" y1="8" x2="64" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5d76e" />
          <stop offset="0.55" stopColor="#e8c547" />
          <stop offset="1" stopColor="#c9a227" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="112" height="112" rx="22" fill={`url(#${uid}-felt)`} />
      <rect
        x="8"
        y="8"
        width="112"
        height="112"
        rx="22"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="4"
      />
      <rect x="16" y="16" width="96" height="96" rx="16" stroke="#e8c547" strokeOpacity="0.28" strokeWidth="1.5" />

      <text
        x="28"
        y="40"
        fill={`url(#${uid}-gold)`}
        fontFamily="Georgia, 'Times New Roman', Times, serif"
        fontSize="22"
        fontWeight="700"
        textAnchor="middle"
      >
        W
      </text>
      <g transform="rotate(180 100 96)">
        <text
          x="100"
          y="104"
          fill={`url(#${uid}-gold)`}
          fontFamily="Georgia, 'Times New Roman', Times, serif"
          fontSize="22"
          fontWeight="700"
          textAnchor="middle"
        >
          W
        </text>
      </g>

      {/* Classic spade: pointed top, two round lobes, narrow stem */}
      <g fill={`url(#${uid}-gold)`}>
        <path d="M64 28 L88 76 H40 Z" />
        <circle cx="48" cy="74" r="16" />
        <circle cx="80" cy="74" r="16" />
        <path d="M61 84 L56 108 H72 L67 84 Z" />
      </g>
    </svg>
  );
}

export function WhistWordmark({ className = "" }: { className?: string }) {
  return (
    <span dir="ltr" className={`inline-block font-bold tracking-tight text-gold-400 ${className}`}>
      WhisT
    </span>
  );
}
