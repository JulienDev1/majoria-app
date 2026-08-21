import React from 'react';

interface CyberBrainHeadProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
  colorScheme?: 'cyan' | 'pink' | 'purple' | 'emerald';
}

export const CyberBrainHead: React.FC<CyberBrainHeadProps> = ({
  className = '',
  size = 32,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Sparkles / Scintillement Orbital Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {/* Top-Right Sparkle Star */}
        <svg
          className="absolute -top-1.5 -right-1.5 w-3 h-3 text-amber-300 animate-sparkle"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>

        {/* Bottom-Left Sparkle Star */}
        <svg
          className="absolute -bottom-1 -left-1.5 w-2.5 h-2.5 text-cyan-300 animate-sparkle-delayed"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>

        {/* Top-Left Sparkle Star */}
        <svg
          className="absolute top-1 -left-2 w-2 h-2 text-pink-300 animate-sparkle-fast"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>

        {/* Bottom-Right Tiny Diamond */}
        <svg
          className="absolute bottom-2 -right-1.5 w-2 h-2 text-emerald-300 animate-sparkle"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>

      {/* Main Vector SVG Cyber Brain Head with Shimmer Gradient */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_0_10px_rgba(0,240,255,0.65)] transition-all duration-300"
      >
        <defs>
          {/* Cyber Gradient */}
          <linearGradient id="cyberHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#00F0FF" />
          </linearGradient>

          {/* Shimmer Sweep Linear Gradient */}
          <linearGradient id="shimmerSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF">
              <animate attributeName="stop-color" values="#00F0FF;#EC4899;#FBBF24;#00F0FF" dur="4s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#FFFFFF">
              <animate attributeName="stop-color" values="#FFFFFF;#FDE047;#FFFFFF" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#EC4899">
              <animate attributeName="stop-color" values="#EC4899;#00F0FF;#EC4899" dur="4s" repeatCount="indefinite" />
            </stop>
          </linearGradient>

          {/* Brain Circuit Glow */}
          <linearGradient id="brainGlow" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          <filter id="neonChipGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Cyber Head Contour with 0.5x border width */}
        <path
          d="M 50 10 
             C 74 10 86 26 86 48 
             C 86 64 78 74 72 82 
             L 66 92 
             L 38 92 
             L 32 84 
             C 24 76 16 64 16 48 
             C 16 26 26 10 50 10 Z"
          stroke="url(#shimmerSweepGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#051020"
          fillOpacity="0.75"
        />

        {/* Jaw & Chin Cyber Plating Lines */}
        <path
          d="M 38 78 L 62 78 M 42 86 L 58 86"
          stroke="#00F0FF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        {/* Cyber Visor / Optical Eyes */}
        <rect
          x="30"
          y="56"
          width="40"
          height="7"
          rx="3.5"
          fill="#00F0FF"
          fillOpacity="0.3"
          stroke="#00F0FF"
          strokeWidth="1"
        />
        <circle cx="42" cy="59.5" r="2" fill="#EC4899" className="animate-pulse" />
        <circle cx="58" cy="59.5" r="2" fill="#00F0FF" className="animate-pulse" />

        {/* BRAIN AREA - Central Neural Chip (Microchip / CPU) */}
        <rect
          x="41"
          y="28"
          width="18"
          height="18"
          rx="3"
          fill="#0B1C38"
          stroke="#A855F7"
          strokeWidth="1.2"
          filter="url(#neonChipGlow)"
        />
        {/* Chip Core Symbol */}
        <rect x="46" y="33" width="8" height="8" rx="1.5" fill="#00F0FF" className="animate-pulse" />

        {/* Chip Pins */}
        <path
          d="M 38 32 L 41 32 M 38 37 L 41 37 M 38 42 L 41 42
             M 59 32 L 62 32 M 59 37 L 62 37 M 59 42 L 62 42
             M 45 25 L 45 28 M 50 25 L 50 28 M 55 25 L 55 28
             M 45 46 L 45 49 M 50 46 L 50 49 M 55 46 L 55 49"
          stroke="#00F0FF"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Neural Circuit Tracks branching from Chip to Head */}
        <path
          d="M 38 32 C 30 32 26 26 28 20 M 38 42 C 28 44 24 50 24 54 M 45 25 C 42 18 36 16 30 18"
          stroke="url(#brainGlow)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 62 32 C 70 32 74 26 72 20 M 62 42 C 72 44 76 50 76 54 M 55 25 C 58 18 64 16 70 18"
          stroke="url(#brainGlow)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Synapse Circuit Nodes / Glowing Dots */}
        <circle cx="28" cy="20" r="1.75" fill="#00F0FF" />
        <circle cx="72" cy="20" r="1.75" fill="#EC4899" />
        <circle cx="30" cy="18" r="1.2" fill="#10B981" />
        <circle cx="70" cy="18" r="1.2" fill="#10B981" />
        <circle cx="24" cy="54" r="1.2" fill="#A855F7" />
        <circle cx="76" cy="54" r="1.2" fill="#00F0FF" />

        {/* Temple Pulse Nodes */}
        <circle cx="20" cy="40" r="1.2" fill="#00F0FF" opacity="0.8" />
        <circle cx="80" cy="40" r="1.2" fill="#EC4899" opacity="0.8" />
      </svg>
    </div>
  );
};
