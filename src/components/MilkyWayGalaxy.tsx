import React, { useEffect, useRef } from 'react';

export type GalaxyColorScheme = 'milky-way-classic' | 'cyber-nebula' | 'rose-galaxy' | 'andromeda-teal';

interface MilkyWayGalaxyProps {
  enabled?: boolean;
  colorScheme?: GalaxyColorScheme;
  opacity?: number;
  speed?: number;
}

interface Star {
  armAngle: number;
  distance: number;
  radius: number;
  speedMultiplier: number;
  color: string;
  glowColor: string;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  isNebulaDust: boolean;
}

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export const MilkyWayGalaxy: React.FC<MilkyWayGalaxyProps> = ({
  enabled = true,
  colorScheme = 'milky-way-classic',
  opacity = 0.9,
  speed = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let cssWidth = 0;
    let cssHeight = 0;
    let dpr = 1;

    let galaxyStars: Star[] = [];
    let bgStars: BackgroundStar[] = [];
    let meteors: Meteor[] = [];
    let lastMeteorTime = performance.now();

    // Theme color palettes for the galaxy
    const getPalette = () => {
      switch (colorScheme) {
        case 'cyber-nebula':
          return {
            core: '#ffffff',
            coreGlow: 'rgba(168, 85, 247, 0.95)',
            coreOuter: 'rgba(59, 130, 246, 0.4)',
            armStars: ['#ffffff', '#a5f3fc', '#c084fc', '#e879f9', '#67e8f9', '#818cf8'],
            nebulaGas: [
              'rgba(147, 51, 234, 0.18)',
              'rgba(59, 130, 246, 0.15)',
              'rgba(236, 72, 153, 0.14)',
              'rgba(6, 182, 212, 0.16)',
            ],
            bgStarGlow: '#c084fc',
            spaceBg: '#02050f',
          };
        case 'rose-galaxy':
          return {
            core: '#fff5f7',
            coreGlow: 'rgba(244, 63, 94, 0.95)',
            coreOuter: 'rgba(217, 70, 239, 0.45)',
            armStars: ['#ffffff', '#fecdd3', '#fda4af', '#f472b6', '#fb7185', '#e879f9'],
            nebulaGas: [
              'rgba(225, 29, 72, 0.18)',
              'rgba(192, 38, 211, 0.16)',
              'rgba(251, 113, 133, 0.14)',
              'rgba(147, 51, 234, 0.13)',
            ],
            bgStarGlow: '#f43f5e',
            spaceBg: '#080208',
          };
        case 'andromeda-teal':
          return {
            core: '#f0fdfa',
            coreGlow: 'rgba(20, 184, 166, 0.95)',
            coreOuter: 'rgba(6, 182, 212, 0.45)',
            armStars: ['#ffffff', '#99f6e4', '#5eead4', '#2dd4bf', '#38bdf8', '#67e8f9'],
            nebulaGas: [
              'rgba(13, 148, 136, 0.18)',
              'rgba(6, 182, 212, 0.16)',
              'rgba(14, 165, 233, 0.14)',
              'rgba(16, 185, 129, 0.13)',
            ],
            bgStarGlow: '#2dd4bf',
            spaceBg: '#01090d',
          };
        case 'milky-way-classic':
        default:
          return {
            core: '#fffbeb',
            coreGlow: 'rgba(251, 191, 36, 0.95)',
            coreOuter: 'rgba(147, 197, 253, 0.45)',
            armStars: [
              '#ffffff',
              '#fef08a',
              '#bfdbfe',
              '#93c5fd',
              '#fed7aa',
              '#e0e7ff',
              '#60a5fa',
              '#f472b6',
            ],
            nebulaGas: [
              'rgba(99, 102, 241, 0.16)',
              'rgba(217, 70, 239, 0.14)',
              'rgba(245, 158, 11, 0.15)',
              'rgba(59, 130, 246, 0.15)',
              'rgba(168, 85, 247, 0.13)',
            ],
            bgStarGlow: '#93c5fd',
            spaceBg: '#020612',
          };
      }
    };

    const initGalaxy = () => {
      if (!canvas || !ctx) return;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0, screen.width || 360);
      cssHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0, screen.height || 640);

      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const palette = getPalette();

      // 1. Generate Deep Space Background Stars
      bgStars = [];
      const bgCount = Math.min(Math.floor((cssWidth * cssHeight) / 2400), 450);
      for (let i = 0; i < bgCount; i++) {
        const starColors = ['#ffffff', '#bfdbfe', '#fef08a', '#e9d5ff', '#fed7aa'];
        bgStars.push({
          x: Math.random() * cssWidth,
          y: Math.random() * cssHeight,
          radius: Math.random() * 1.4 + 0.3,
          alpha: Math.random() * 0.75 + 0.25,
          twinkleSpeed: Math.random() * 2 + 0.8,
          twinklePhase: Math.random() * Math.PI * 2,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }

      // 2. Generate Spiral Galaxy Arms and Cosmic Dust
      galaxyStars = [];
      const numArms = 2; // Two main graceful spiral arms
      const armSpread = 0.55; // Spread around the arm axis
      const totalStars = Math.min(Math.floor(cssWidth * 1.1), 1400);
      const maxGalaxyRadius = Math.min(cssWidth, cssHeight) * 0.72;

      for (let i = 0; i < totalStars; i++) {
        // Logarithmic spiral distribution
        const armIndex = i % numArms;
        const armOffset = (armIndex * 2 * Math.PI) / numArms;

        // Radius distribution (more dense towards galactic core)
        const distRatio = Math.pow(Math.random(), 1.6);
        const distance = distRatio * maxGalaxyRadius;

        // Spiral angle with winding factor
        const spiralAngle = distance * 0.0075 + armOffset;
        // Random Gaussian-like offset from the center of the arm
        const angleSpread = (Math.random() - 0.5) * armSpread * (0.3 + distRatio * 0.7);
        const armAngle = spiralAngle + angleSpread;

        const isDust = Math.random() < 0.28;
        const starColor = palette.armStars[Math.floor(Math.random() * palette.armStars.length)];

        galaxyStars.push({
          armAngle,
          distance,
          radius: isDust ? Math.random() * 5 + 3 : Math.random() * 1.8 + 0.4,
          speedMultiplier: (1 - distRatio * 0.4) * (0.8 + Math.random() * 0.4),
          color: isDust
            ? palette.nebulaGas[Math.floor(Math.random() * palette.nebulaGas.length)]
            : starColor,
          glowColor: palette.bgStarGlow,
          baseAlpha: isDust ? Math.random() * 0.25 + 0.1 : Math.random() * 0.8 + 0.3,
          twinkleSpeed: Math.random() * 3 + 1,
          twinklePhase: Math.random() * Math.PI * 2,
          isNebulaDust: isDust,
        });
      }
    };

    initGalaxy();

    const handleResize = () => {
      initGalaxy();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let lastTime = performance.now();
    let galaxyRotation = 0;

    const spawnMeteor = () => {
      const angle = (Math.PI / 4) + (Math.random() * 0.4 - 0.2); // ~45 deg downward streak
      const startX = Math.random() * (cssWidth * 1.2) - (cssWidth * 0.1);
      const startY = Math.random() * (cssHeight * 0.4) - 50;

      meteors.push({
        x: startX,
        y: startY,
        length: Math.random() * 100 + 70,
        speed: (Math.random() * 450 + 550) * speed,
        angle,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 0.6 + 0.4, // seconds
        color: Math.random() > 0.4 ? '#a5f3fc' : '#fed7aa',
      });
    };

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const palette = getPalette();

      // Smooth galactic rotation
      galaxyRotation += 0.05 * speed * dt;

      // Clear Canvas to allow background wallpaper / colors to show through
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Deep space ambient subtle glow
      const ambientGlow = ctx.createRadialGradient(
        cssWidth * 0.5,
        cssHeight * 0.48,
        50,
        cssWidth * 0.5,
        cssHeight * 0.48,
        Math.max(cssWidth, cssHeight) * 0.7
      );
      ambientGlow.addColorStop(0, 'rgba(30, 27, 75, 0.25)');
      ambientGlow.addColorStop(0.5, 'rgba(15, 23, 42, 0.15)');
      ambientGlow.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // 1. Draw Deep Space Background Stars
      for (let i = 0; i < bgStars.length; i++) {
        const star = bgStars[i];
        const twinkle = Math.sin(now * 0.0015 * star.twinkleSpeed + star.twinklePhase);
        const currentAlpha = Math.max(0.1, star.alpha + twinkle * 0.3);

        ctx.fillStyle = star.color;
        ctx.globalAlpha = currentAlpha * opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Shooting Stars / Meteors
      if (now - lastMeteorTime > (4000 / (speed || 1)) + Math.random() * 5000) {
        if (meteors.length < 3) {
          spawnMeteor();
        }
        lastMeteorTime = now;
      }

      for (let m = meteors.length - 1; m >= 0; m--) {
        const meteor = meteors[m];
        meteor.life += dt;
        const progress = meteor.life / meteor.maxLife;

        if (progress >= 1) {
          meteors.splice(m, 1);
          continue;
        }

        meteor.x += Math.cos(meteor.angle) * meteor.speed * dt;
        meteor.y += Math.sin(meteor.angle) * meteor.speed * dt;

        const tailAlpha = Math.sin(progress * Math.PI) * opacity;
        const tailX = meteor.x - Math.cos(meteor.angle) * meteor.length;
        const tailY = meteor.y - Math.sin(meteor.angle) * meteor.length;

        const grad = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, meteor.color);
        grad.addColorStop(1, '#ffffff');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = tailAlpha;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(meteor.x, meteor.y);
        ctx.stroke();

        // Meteor Head Sparkle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Draw The Milky Way Galaxy (Tilted Perspective 3D Ellipse)
      const centerX = cssWidth * 0.5;
      const centerY = cssHeight * 0.48;
      const galaxyTilt = 0.55; // Aspect ratio of ellipse (viewing angle)
      const galaxyAngle = 0.45; // Spatial tilt angle of the galactic plane

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(galaxyAngle);

      // Galactic Core Nebula Glow
      const coreRadius = Math.min(cssWidth, cssHeight) * 0.28;
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.15, palette.coreGlow);
      coreGrad.addColorStop(0.45, palette.coreOuter);
      coreGrad.addColorStop(0.85, 'rgba(79, 70, 229, 0.08)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.scale(1, galaxyTilt);
      ctx.fillStyle = coreGrad;
      ctx.globalAlpha = 0.85 * opacity;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Galaxy Stars & Nebular Dust Clouds
      for (let s = 0; s < galaxyStars.length; s++) {
        const star = galaxyStars[s];
        const currentAngle = star.armAngle + galaxyRotation * star.speedMultiplier;

        // Position on tilted galactic plane
        const x = Math.cos(currentAngle) * star.distance;
        const y = Math.sin(currentAngle) * star.distance * galaxyTilt;

        const twinkle = Math.sin(now * 0.002 * star.twinkleSpeed + star.twinklePhase);
        const starAlpha = Math.max(0.15, star.baseAlpha + twinkle * 0.25) * opacity;

        ctx.globalAlpha = starAlpha;

        if (star.isNebulaDust) {
          // Soft glowing interstellar gas cloud
          ctx.fillStyle = star.color;
          ctx.beginPath();
          ctx.arc(x, y, star.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sharp glittering star
          ctx.fillStyle = star.color;
          ctx.beginPath();
          ctx.arc(x, y, star.radius, 0, Math.PI * 2);
          ctx.fill();

          // Extra luminous sparkle on brighter stars
          if (star.radius > 1.2 && Math.random() > 0.6) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - 0.5, y - 2, 1, 4);
            ctx.fillRect(x - 2, y - 0.5, 4, 1);
          }
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, colorScheme, speed, opacity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 w-full h-full"
      style={{ opacity }}
    />
  );
};
