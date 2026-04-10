import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const Particles = ({ color }: { color: string }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { mouse, viewport } = useThree();
  
  const count = 3000;
  const [positions, sizes, initialPositions] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const initialPositions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 5;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;
      
      sizes[i] = Math.random() * 2.0;
    }
    return [positions, sizes, initialPositions];
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uDrag: { value: 0 }
  }), [color]);

  // Update color if it changes
  React.useEffect(() => {
    uniforms.uColor.value.set(color);
  }, [color, uniforms]);

  const isDragging = useRef(false);
  const targetDrag = useRef(0);

  React.useEffect(() => {
    const handleDown = () => { isDragging.current = true; targetDrag.current = 1; };
    const handleUp = () => { isDragging.current = false; targetDrag.current = 0; };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchstart', handleDown);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchstart', handleDown);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    uniforms.uTime.value = state.clock.elapsedTime;
    
    // Smooth mouse position
    uniforms.uMouse.value.x = THREE.MathUtils.lerp(uniforms.uMouse.value.x, (mouse.x * viewport.width) / 2, 0.1);
    uniforms.uMouse.value.y = THREE.MathUtils.lerp(uniforms.uMouse.value.y, (mouse.y * viewport.height) / 2, 0.1);
    
    // Smooth drag state
    uniforms.uDrag.value = THREE.MathUtils.lerp(uniforms.uDrag.value, targetDrag.current, 0.1);
    
    // Rotate slowly
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    pointsRef.current.rotation.x = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aInitialPosition"
          count={count}
          array={initialPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          uniform float uDrag;
          attribute float aSize;
          attribute vec3 aInitialPosition;
          
          varying float vDistance;
          
          void main() {
            vec3 pos = position;
            
            // Roaming effect
            pos.x += sin(uTime * 0.5 + aInitialPosition.z) * 0.5;
            pos.y += cos(uTime * 0.3 + aInitialPosition.x) * 0.5;
            
            // Mouse interaction
            vec4 worldPos = modelMatrix * vec4(pos, 1.0);
            float dist = distance(worldPos.xy, uMouse);
            
            // Wave effect on drag
            float wave = sin(dist * 2.0 - uTime * 5.0) * 0.5 * uDrag;
            
            // Repulsion
            float repulsion = max(0.0, 3.0 - dist);
            vec2 dir = normalize(worldPos.xy - uMouse);
            
            worldPos.xy += dir * repulsion * (0.5 + uDrag * 1.5);
            worldPos.z += wave * 2.0;
            
            vDistance = dist;
            
            vec4 mvPosition = viewMatrix * worldPos;
            gl_Position = projectionMatrix * mvPosition;
            
            gl_PointSize = aSize * (300.0 / -mvPosition.z) * (1.0 + uDrag * 0.5);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uDrag;
          varying float vDistance;
          
          void main() {
            // Circle shape
            float distToCenter = distance(gl_PointCoord, vec2(0.5));
            if (distToCenter > 0.5) discard;
            
            // Soft edge
            float alpha = 1.0 - (distToCenter * 2.0);
            
            // Glow intensity based on drag and distance
            float intensity = 1.0 + (uDrag * max(0.0, 1.0 - vDistance * 0.2));
            
            gl_FragColor = vec4(uColor * intensity, alpha * 0.6);
          }
        `}
      />
    </points>
  );
};

export const HeroParticles = ({ color }: { color: string }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-auto">
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
        <Particles color={color} />
      </Canvas>
    </div>
  );
};
