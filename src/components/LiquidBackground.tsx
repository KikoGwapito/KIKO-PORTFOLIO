import React, { useEffect, useRef } from 'react';
import { useAppData } from '../context/AppDataContext';

class Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  baseAlpha: number;
  glowMultiplier: number;
  wanderAngle: number;
  wanderSpeed: number;
  shape: 'bokeh' | 'flare' | 'star';
  rotation: number;
  rotationSpeed: number;

  constructor(width: number, height: number) {
    // Randomize Position (X, Y, Z)
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.z = Math.random() * 800 - 400; // Deep 3D space (-400 to 400)
    this.vx = 0;
    this.vy = 0;
    this.size = Math.random() * 1.5 + 0.8; // Smaller base size for particles
    this.baseSize = this.size;
    this.baseAlpha = Math.random() * 0.6 + 0.4; // Randomize base glowing (brighter opacities)
    this.glowMultiplier = 1;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderSpeed = Math.random() * 0.3 + 0.1;
    
    // Assign shape: mostly glowing bokeh, some bright stars/flares
    const shapes = ['flare', 'star', 'bokeh', 'bokeh', 'bokeh'] as const;
    this.shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.05;
  }

  update(mouseX: number, mouseY: number, isHovering: boolean, isHolding: boolean, width: number, height: number, speedMult: number, speedState: string) {
    const isGatheringState = speedState === 'gathering' || (isHolding && mouseX > -100);

    if (isGatheringState) {
      const isMouseVortex = isHolding && mouseX > -100;
      const targetX = isMouseVortex ? mouseX : width / 2;
      const targetY = isMouseVortex ? mouseY : height / 2;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 1) {
        // Pull towards target (stronger if mouse vortex)
        const pullStrength = isMouseVortex 
          ? (12.0 + (1000 / Math.max(dist, 2))) 
          : (0.5 + (100 / Math.max(dist, 50)));
        this.vx += (dx / dist) * pullStrength;
        this.vy += (dy / dist) * pullStrength;
        
        // Slower, tighter swirl around target when holding
        const swirlStrength = isMouseVortex 
          ? (Math.min(10, 200 / Math.max(dist, 5))) 
          : 2;
        this.vx += (-dy / dist) * swirlStrength;
        this.vy += (dx / dist) * swirlStrength;
      } else {
        // Softly settle in the center forming a compact core
        this.x = targetX;
        this.y = targetY;
        this.vx *= isMouseVortex ? 0.1 : 0.8;
        this.vy *= isMouseVortex ? 0.1 : 0.8;
      }
      
      // Make them glow brightly, glowing more as they compact
      this.glowMultiplier = Math.max(this.glowMultiplier, (isMouseVortex ? 2.0 : 1.5) + (300 / Math.max(dist, 10)));
      this.z += (0 - this.z) * (isMouseVortex ? 0.2 : 0.05); // Flatten Z towards 0
      
      this.rotation += this.rotationSpeed * (isMouseVortex ? 10 : 5);
      
      // Slowly shrink particles in the vortex to form a compressed dot
      if (isMouseVortex) {
        this.size = Math.max(0.3, this.size * 0.9);
      }
    } else {
      // Restore size
      this.size += (this.baseSize - this.size) * 0.1;
      
      // Normal behavior
      const effectiveSpeedMult = speedMult;
      
      this.wanderAngle += (Math.random() - 0.5) * 0.15 * effectiveSpeedMult;
      this.vx += Math.cos(this.wanderAngle) * this.wanderSpeed * 0.1 * effectiveSpeedMult;
      this.vy += Math.sin(this.wanderAngle) * this.wanderSpeed * 0.1 * effectiveSpeedMult;
      
      this.rotation += this.rotationSpeed * effectiveSpeedMult;

      if (isHovering && mouseX > -100) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        // Calculate distance in 2D space for simple interactive feeling
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 250) {
          const force = (250 - dist) / 250;
          const angle = Math.atan2(dy, dx);
          
          // Subtle drift away from mouse
          this.vx -= Math.cos(angle) * force * 0.4;
          this.vy -= Math.sin(angle) * force * 0.4;
        }
      }
    }

    // Subtly animate Z (depth) so things slowly drift forward/back
    if (!isGatheringState) {
       this.z += Math.sin(Date.now() * 0.001 + this.x * 0.01) * 0.3;
    }

    // Smooth decay for click glow burst
    if (this.glowMultiplier > 1) {
      this.glowMultiplier -= isGatheringState ? 0.05 : 0.02;
    } else {
      this.glowMultiplier = 1;
    }

    // Apply soft friction (stronger if gathering)
    const friction = isGatheringState ? ((isHolding && mouseX > -100) ? 0.88 : 0.85) : 0.96;
    this.vx *= friction;
    this.vy *= friction;
    
    // Update vector
    this.x += this.vx;
    this.y += this.vy;

    // Organic infinite wrap-around (with margin so they don't clip visibly on edges)
    // Don't wrap around if gathering to center nicely
    if (!isGatheringState) {
      const margin = 200;
      if (this.x < -margin) this.x = width + margin;
      if (this.x > width + margin) this.x = -margin;
      if (this.y < -margin) this.y = height + margin;
      if (this.y > height + margin) this.y = -margin;
    }
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

    // Twinkling effect
    const twinkle = 0.7 + 0.3 * Math.sin(Date.now() * 0.003 + this.x * 10);
    const finalAlpha = alpha * twinkle;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(this.rotation);
    
    if (this.shape === 'flare') {
      const gColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b},`;
      
      // Luminous core
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
      ctx.fill();

      // Core glow
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledSize * 4);
      grad.addColorStop(0, `rgba(255, 255, 255, ${finalAlpha * 0.9})`);
      grad.addColorStop(0.3, `${gColor} ${finalAlpha * 0.8})`);
      grad.addColorStop(0.6, `${gColor} ${finalAlpha * 0.3})`);
      grad.addColorStop(1, `${gColor} 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize * 4, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal streak (smaller and rounder feel)
      const streakLen = scaledSize * 12;
      const streakGrad = ctx.createLinearGradient(-streakLen, 0, streakLen, 0);
      streakGrad.addColorStop(0, `${gColor} 0)`);
      streakGrad.addColorStop(0.4, `rgba(255, 255, 255, ${finalAlpha * 0.8})`);
      streakGrad.addColorStop(0.5, `rgba(255, 255, 255, ${finalAlpha})`);
      streakGrad.addColorStop(0.6, `rgba(255, 255, 255, ${finalAlpha * 0.8})`);
      streakGrad.addColorStop(1, `${gColor} 0)`);
      ctx.fillStyle = streakGrad;
      
      // Make streaks a bit thicker for "roundness"
      ctx.beginPath();
      ctx.ellipse(0, 0, streakLen, scaledSize * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Vertical streak (cross)
      const vStreakLen = scaledSize * 4;
      const vStreakGrad = ctx.createLinearGradient(0, -vStreakLen, 0, vStreakLen);
      vStreakGrad.addColorStop(0, `${gColor} 0)`);
      vStreakGrad.addColorStop(0.4, `rgba(255, 255, 255, ${finalAlpha * 0.6})`);
      vStreakGrad.addColorStop(0.5, `rgba(255, 255, 255, ${finalAlpha * 0.9})`);
      vStreakGrad.addColorStop(0.6, `rgba(255, 255, 255, ${finalAlpha * 0.6})`);
      vStreakGrad.addColorStop(1, `${gColor} 0)`);
      ctx.fillStyle = vStreakGrad;
      
      ctx.beginPath();
      ctx.ellipse(0, 0, scaledSize * 0.25, vStreakLen, 0, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (this.shape === 'star') {
      const gColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b},`;
      
      // Luminous core
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
      ctx.fill();

      // Soft halo
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledSize * 3);
      grad.addColorStop(0, `rgba(255, 255, 255, ${finalAlpha * 0.8})`);
      grad.addColorStop(0.3, `${gColor} ${finalAlpha * 0.6})`);
      grad.addColorStop(1, `${gColor} 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize * 3, 0, Math.PI * 2);
      ctx.fill();

      // 4-point star cross (more compact, rounded core)
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? scaledSize * 6 : scaledSize * 0.8;
        const angle = (Math.PI * i) / 4;
        
        if (i === 0) ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
        else {
          // Quadratic curves for a rounder core
          const prevAngle = (Math.PI * (i - 1)) / 4;
          const cpRad = scaledSize * 0.4;
          const cpX = Math.cos((angle + prevAngle) / 2) * cpRad;
          const cpY = Math.sin((angle + prevAngle) / 2) * cpRad;
          ctx.quadraticCurveTo(cpX, cpY, Math.cos(angle) * rad, Math.sin(angle) * rad);
        }
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha * 0.6})`;
      ctx.fill();
      
    } else {
      // 'bokeh' particle
      const gColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b},`;
      
      // Bright solid core
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
      ctx.fill();

      // Outer soft ring / glowing aura
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledSize * 3);
      grad.addColorStop(0, `rgba(255, 255, 255, ${finalAlpha * 0.9})`);
      grad.addColorStop(0.3, `${gColor} ${finalAlpha * 0.6})`);
      grad.addColorStop(0.8, `${gColor} ${finalAlpha * 0.2})`);
      grad.addColorStop(1, `${gColor} 0)`);
      ctx.beginPath();
      ctx.arc(0, 0, scaledSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    
    ctx.restore(); // Restore context state to prevent rotation/translation from affecting other elements
  }
}

export function LiquidBackground({ speedState = 'normal' }: { speedState?: 'gathering' | 'wild' | 'slow' | 'normal' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data } = useAppData();
  const primaryColor = data.theme.primaryColor || '#10b981';
  const backgroundColor = data.theme.backgroundColor || '#09090b';
  const speedStateRef = useRef(speedState);
  const prevSpeedStateRef = useRef(speedState);

  useEffect(() => {
    prevSpeedStateRef.current = speedStateRef.current;
    speedStateRef.current = speedState;
  }, [speedState]);
  
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
      // Calculate density dynamically based on user screen size for consistent aesthetics (reduced for performance)
      const count = Math.min(100, Math.max(50, Math.floor((width * height) / 18000)));
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(width, height));
      }
    };
    createParticles();

    let mouseX = -1000;
    let mouseY = -1000;
    let isHovering = false;
    let isHolding = false;
    let prevIsHolding = false;

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
      // Particles explosion handled by prevIsHolding logic now, but you can keep triggerClick for non-holding clicks
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
      { x: width * 0.2, y: height * 0.2, baseR: Math.max(width * 0.4, 600), r: Math.max(width * 0.4, 600), vx: 0.3, vy: 0.2 },
      { x: width * 0.8, y: height * 0.8, baseR: Math.max(width * 0.5, 800), r: Math.max(width * 0.5, 800), vx: -0.2, vy: -0.4 },
      { x: width * 0.5, y: height * 0.5, baseR: Math.max(width * 0.3, 500), r: Math.max(width * 0.3, 500), vx: 0.2, vy: -0.1 }
    ];

    let currentBlobSpeed = speedStateRef.current === 'wild' ? 15 : speedStateRef.current === 'slow' ? 0.3 : speedStateRef.current === 'gathering' ? 5 : 1;
    let currentParticleSpeed = speedStateRef.current === 'wild' ? 30 : speedStateRef.current === 'slow' ? 0.1 : speedStateRef.current === 'gathering' ? 2 : 1;

    let animationId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const targetBlobSpeed = speedStateRef.current === 'wild' ? 15 : speedStateRef.current === 'slow' ? 0.3 : speedStateRef.current === 'gathering' ? 5 : 1;
      currentBlobSpeed += (targetBlobSpeed - currentBlobSpeed) * 0.02;
      
      const targetParticleSpeed = speedStateRef.current === 'wild' ? 30 : speedStateRef.current === 'slow' ? 0.1 : speedStateRef.current === 'gathering' ? 2 : 1;
      currentParticleSpeed += (targetParticleSpeed - currentParticleSpeed) * 0.02;

      // Render moving minimalist fluid gradient glass wave
      blobs.forEach((blob, i) => {
        const isGatheringState = speedStateRef.current === 'gathering' || (isHolding && mouseX > -100);
        
        if (isGatheringState) {
          const isMouseVortex = isHolding && mouseX > -100;
          const targetX = isMouseVortex ? mouseX : width / 2;
          const targetY = isMouseVortex ? mouseY : height / 2;
          // move blob to center and shrink slightly for a compact glowing effect
          blob.x += (targetX - blob.x) * (isMouseVortex ? 0.15 : 0.05);
          blob.y += (targetY - blob.y) * (isMouseVortex ? 0.15 : 0.05);
          blob.r += (150 - blob.r) * (isMouseVortex ? 0.15 : 0.05); // Shrink to a dense core
        } else {
          blob.x += blob.vx * currentBlobSpeed;
          blob.y += blob.vy * currentBlobSpeed;
          blob.r += (blob.baseR - blob.r) * 0.05; // Restore size

          if (blob.x < -blob.r || blob.x > width + blob.r) blob.vx *= -1;
          if (blob.y < -blob.r || blob.y > height + blob.r) blob.vy *= -1;
        }

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
      // Detect gathering -> slow/normal explosion
      if ((prevSpeedStateRef.current === 'gathering' && speedStateRef.current !== 'gathering') || (prevIsHolding && !isHolding)) {
        // Explode!
        particles.forEach(p => {
          // Explode outwards from center
          const originX = prevIsHolding ? mouseX : width / 2;
          const originY = prevIsHolding ? mouseY : height / 2;
          const dx = p.x - originX;
          const dy = p.y - originY;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const force = (Math.random() * 50 + 30) * (prevIsHolding ? 1.5 : 1); // Stronger explosion on mouse release
          p.vx += (dx / Math.max(dist, 10)) * force;
          p.vy += (dy / Math.max(dist, 10)) * force;
          p.z += (Math.random() - 0.5) * 800; // Deep scatter
          p.glowMultiplier = 10;
        });

        // Scatter blobs occasionally too
        blobs.forEach(blob => {
           blob.vx = (Math.random() - 0.5) * 15;
           blob.vy = (Math.random() - 0.5) * 15;
        });

        if (prevSpeedStateRef.current === 'gathering') {
          prevSpeedStateRef.current = speedStateRef.current; // Reset so it doesn't fire again
        }
      }

      prevIsHolding = isHolding;

      // This is crucial for true 3D spatial alignment
      particles.sort((a, b) => b.z - a.z);

      // Update and Draw interacting particles
      particles.forEach(p => {
        p.update(mouseX, mouseY, isHovering, isHolding, width, height, currentParticleSpeed, speedStateRef.current);
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
      <div className="absolute inset-0 bg-grid opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950 pointer-events-none opacity-60" />
    </div>
  );
}
