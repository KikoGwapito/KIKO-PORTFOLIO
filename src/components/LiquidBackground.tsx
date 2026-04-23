import React, { useEffect, useRef } from 'react';
import { useAppData } from '../context/AppDataContext';

class Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  glowMultiplier: number;
  wanderAngle: number;
  wanderSpeed: number;

  constructor(width: number, height: number) {
    // Randomize Position (X, Y, Z)
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.z = Math.random() * 800 - 400; // Deep 3D space (-400 to 400)
    this.vx = 0;
    this.vy = 0;
    this.size = Math.random() * 2 + 1.2; // Minimalist varied size
    this.baseAlpha = Math.random() * 0.6 + 0.4; // Randomize base glowing (brighter opacities)
    this.glowMultiplier = 1;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderSpeed = Math.random() * 0.3 + 0.1;
  }

  update(mouseX: number, mouseY: number, isHovering: boolean, isHolding: boolean, width: number, height: number) {
    // Randomize moving (organic 3D drifting)
    const holdSpeedMult = isHolding ? 5 : 1;
    this.wanderAngle += (Math.random() - 0.5) * 0.15 * holdSpeedMult;
    this.vx += Math.cos(this.wanderAngle) * this.wanderSpeed * 0.1 * holdSpeedMult;
    this.vy += Math.sin(this.wanderAngle) * this.wanderSpeed * 0.1 * holdSpeedMult;

    if (isHovering && mouseX > -100) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      // Calculate distance in 2D space for simple interactive feeling
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 250) {
        const force = (250 - dist) / 250;
        const angle = Math.atan2(dy, dx);
        
        if (isHolding) {
          // Attract strongly when holding! Like a black hole
          this.vx += Math.cos(angle) * force * 1.5;
          this.vy += Math.sin(angle) * force * 1.5;
          this.z -= force * 15; // Pull forward
          this.glowMultiplier = Math.max(this.glowMultiplier, 1 + force * 2);
        } else {
          // Subtle drift away from mouse
          this.vx -= Math.cos(angle) * force * 0.4;
          this.vy -= Math.sin(angle) * force * 0.4;
        }
      }
    }

    // Subtly animate Z (depth) so things slowly drift forward/back
    this.z += Math.sin(Date.now() * 0.001 + this.x * 0.01) * 0.3 * holdSpeedMult;

    // Smooth decay for click glow burst
    if (this.glowMultiplier > 1) {
      this.glowMultiplier -= 0.02;
    } else {
      this.glowMultiplier = 1;
    }

    // Apply soft friction
    this.vx *= 0.96;
    this.vy *= 0.96;
    
    // Update vector
    this.x += this.vx;
    this.y += this.vy;

    // Organic infinite wrap-around (with margin so they don't clip visibly on edges)
    const margin = 200;
    if (this.x < -margin) this.x = width + margin;
    if (this.x > width + margin) this.x = -margin;
    if (this.y < -margin) this.y = height + margin;
    if (this.y > height + margin) this.y = -margin;
  }

  triggerClick(mouseX: number, mouseY: number) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Generous area of effect for dramatic visual click reward
    if (dist < 500) {
      const force = (500 - dist) / 500;
      // Exponential burst of glow!
      this.glowMultiplier = 1 + (force * 5); 
      
      // 3D Ripple scatter physics
      const angle = Math.atan2(dy, dx);
      this.vx -= Math.cos(angle) * force * 8;
      this.vy -= Math.sin(angle) * force * 8;
      this.z += (Math.random() - 0.5) * 200 * force;
    }
  }

  draw(ctx: CanvasRenderingContext2D, rgb: {r: number, g: number, b: number}, width: number, height: number) {
    // True camera perspective calculation
    const focalLength = 600;
    const p = focalLength / (focalLength - this.z); 
    
    if (p < 0 || p > 4) return; // Cull particles behind camera or way too close to screen

    const drawX = (this.x - width / 2) * p + width / 2;
    const drawY = (this.y - height / 2) * p + height / 2;
    
    // Depth-affected scale and opacity computation
    const scaledSize = Math.max(0.1, this.size * p * (1 + (this.glowMultiplier - 1) * 0.3));
    const alpha = Math.max(0, Math.min(1, this.baseAlpha * p * this.glowMultiplier));

    ctx.beginPath();
    ctx.arc(drawX, drawY, scaledSize, 0, Math.PI * 2);
    
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    
    // Dynamic bloom: apply expensive shadow effects ONLY when particle is actively glowing 
    // from a click to ensure 60fps steady rendering
    if (this.glowMultiplier > 1.2) {
      ctx.shadowBlur = 15 * this.glowMultiplier;
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    } else {
      ctx.shadowBlur = 0; 
    }

    ctx.fill();
    ctx.shadowBlur = 0; // Reset state
  }
}

export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data } = useAppData();
  const primaryColor = data.theme.primaryColor || '#10b981';
  const backgroundColor = data.theme.backgroundColor || '#09090b';
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    // Safe robust hex to rgb
    const hexToRgb = (hex: string) => {
      const fullHex = hex.length === 4 
        ? '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3] 
        : hex;
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 16, g: 185, b: 129 };
    };
    const rgb = hexToRgb(primaryColor);

    let particles: Particle[] = [];
    
    const createParticles = () => {
      particles = [];
      // Calculate density dynamically based on user screen size for consistent aesthetics
      const count = Math.min(300, Math.max(100, Math.floor((width * height) / 9000)));
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(width, height));
      }
    };
    createParticles();

    let mouseX = -1000;
    let mouseY = -1000;
    let isHovering = false;
    let isHolding = false;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isHovering = true;
    };
    
    const handleMouseLeave = () => {
      isHovering = false;
      mouseX = -1000;
      mouseY = -1000;
      isHolding = false;
    };

    const handleMouseDown = () => {
      isHolding = true;
    };

    const handleMouseUp = () => {
      isHolding = false;
    };

    const handleClick = (e: MouseEvent) => {
      particles.forEach(p => p.triggerClick(e.clientX, e.clientY));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles(); // Respawn on resize to cleanly distribute space
    };
    window.addEventListener('resize', handleResize);

    // Large fluid gradient blobs in background for wave effect
    const blobs = [
      { x: width * 0.2, y: height * 0.2, r: Math.max(width * 0.4, 600), vx: 0.3, vy: 0.2 },
      { x: width * 0.8, y: height * 0.8, r: Math.max(width * 0.5, 800), vx: -0.2, vy: -0.4 },
      { x: width * 0.5, y: height * 0.5, r: Math.max(width * 0.3, 500), vx: 0.2, vy: -0.1 }
    ];

    let animationId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render moving minimalist fluid gradient glass wave
      blobs.forEach((blob, i) => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (blob.x < -blob.r || blob.x > width + blob.r) blob.vx *= -1;
        if (blob.y < -blob.r || blob.y > height + blob.r) blob.vy *= -1;

        const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
        
        // Enrich the color slightly to give deeper complex glass wave visuals
        let r = rgb.r, g = rgb.g, b = rgb.b;
        if (i === 1) { r = Math.min(255, r + 40); b = Math.max(0, b - 40); }
        if (i === 2) { r = Math.max(0, r - 30); g = Math.min(255, g + 40); }

        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.08)`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Sort particles by Z index BEFORE drawing for proper 3D rendering occlusion (back to front)
      // This is crucial for true 3D spatial alignment
      particles.sort((a, b) => b.z - a.z);

      // Update and Draw interacting particles
      particles.forEach(p => {
        p.update(mouseX, mouseY, isHovering, isHolding, width, height);
        p.draw(ctx, rgb, width, height);
      });

      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [primaryColor]);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none w-full h-full overflow-hidden">
      {/* Solid minimal themed base */}
      <div className="absolute inset-0" style={{ backgroundColor }} />
      
      {/* 3D Canvas rendering layer */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block w-full h-full opacity-90"
      />
      
      {/* Delicate grain/grid and vignette for the minimalist glass effect overlay */}
      <div className="absolute inset-0 bg-zinc-950/20" />
      <div className="absolute inset-0 bg-grid opacity-10 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950 pointer-events-none opacity-60" />
    </div>
  );
}
