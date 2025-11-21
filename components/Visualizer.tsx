import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Base circle/glow
      const baseRadius = 50 + (volume * 30);

      // Dynamic Gradient
      const gradient = ctx.createRadialGradient(width / 2, centerY, baseRadius * 0.5, width / 2, centerY, baseRadius * 2);
      if (isActive) {
        gradient.addColorStop(0, 'rgba(220, 38, 38, 0.9)'); // Red-600
        gradient.addColorStop(0.5, 'rgba(185, 28, 28, 0.4)'); // Red-700
        gradient.addColorStop(1, 'rgba(153, 27, 27, 0)'); // Red-800 transparent
      } else {
        gradient.addColorStop(0, 'rgba(39, 39, 42, 0.5)'); // Zinc-800
        gradient.addColorStop(1, 'rgba(24, 24, 27, 0)'); // Zinc-900
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(width / 2, centerY, baseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Waveform
      if (isActive) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        for (let i = 0; i < width; i++) {
          const barHeight = volume * 50;
          // Sine wave modulated by volume and phase
          const y = centerY + Math.sin((i * 0.02) + phase) * Math.cos((i * 0.01) - phase) * barHeight;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
      }

      phase += 0.1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [volume, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={300}
      className="w-full h-64 md:h-80"
    />
  );
};

export default Visualizer;
