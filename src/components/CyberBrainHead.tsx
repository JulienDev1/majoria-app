import React from 'react';

interface CyberBrainHeadProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
  colorScheme?: 'cyan' | 'pink' | 'purple' | 'emerald';
}

/**
 * Static MajorI.A Icon Logo
 * Clean, high-tech, razor-sharp vector emblem without distracting sparkles or flashing animations.
 */
export const CyberBrainHead: React.FC<CyberBrainHeadProps> = ({
  className = '',
  size = 32,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Crisp static gradient for outer shield/contour */}
          <linearGradient id="staticMajorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          {/* Core neural gradient */}
          <linearGradient id="staticCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Circuit accents */}
          <linearGradient id="staticAccentGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Outer Hexagonal Cyber Contour */}
        <path
          d="M 50 8 
             L 86 28 
             L 86 72 
             L 50 92 
             L 14 72 
             L 14 28 Z"
          fill="#0B132B"
          stroke="url(#staticMajorGrad)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Tech Frame */}
        <path
          d="M 50 18 
             L 76 33 
             L 76 67 
             L 50 82 
             L 24 67 
             L 24 33 Z"
          fill="#070C1E"
          stroke="#38BDF8"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          strokeLinejoin="round"
        />

        {/* Central Brain / Neural Processor Symbol */}
        {/* Left Brain Hemisphere */}
        <path
          d="M 46 32
             C 38 32 32 37 32 44
             C 32 48 35 52 38 54
             C 34 56 32 60 33 65
             C 34 70 39 74 46 75
             L 46 32 Z"
          fill="url(#staticCoreGrad)"
          fillOpacity="0.85"
        />

        {/* Right Brain Hemisphere */}
        <path
          d="M 54 32
             C 62 32 68 37 68 44
             C 68 48 65 52 62 54
             C 66 56 68 60 67 65
             C 66 70 61 74 54 75
             L 54 32 Z"
          fill="url(#staticAccentGrad)"
          fillOpacity="0.85"
        />

        {/* Center Synaptic Divider / Data Bus */}
        <line x1="50" y1="28" x2="50" y2="78" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.9" />

        {/* Neural Synapse Nodes (Static crisp circles) */}
        <circle cx="50" cy="36" r="2.2" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="2.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1" />
        <circle cx="50" cy="64" r="2.2" fill="#FFFFFF" />

        {/* Circuit Interconnect Traces */}
        <path
          d="M 32 44 L 20 44 M 33 65 L 20 68 M 68 44 L 80 44 M 67 65 L 80 68"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />

        {/* Top/Bottom Micro-Nodes */}
        <circle cx="50" cy="14" r="2" fill="#38BDF8" />
        <circle cx="50" cy="86" r="2" fill="#C084FC" />
        <circle cx="20" cy="44" r="1.5" fill="#38BDF8" />
        <circle cx="80" cy="44" r="1.5" fill="#C084FC" />
      </svg>
    </div>
  );
};
