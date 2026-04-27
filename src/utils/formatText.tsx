import React, { useState } from 'react';
import { motion } from 'motion/react';

const FlareLetter: React.FC<{ char: string, color: string, interval?: number }> = ({ char, color, interval = 1 }) => {
  // Reduce simultaneous appearances by increasing the delay range
  const [delay] = useState(() => Math.random() * (4 * interval));
  const [duration] = useState(() => 1.5 + Math.random() * 1.5);
  
  // Random placement over the letter
  const [xPos] = useState(() => 10 + Math.random() * 80);
  const [yPos] = useState(() => 10 + Math.random() * 80);
  
  // 2.5em to 4em size so it corresponds to text size but keeps tails minimal
  const [size] = useState(() => 2.5 + Math.random() * 1.5);
  
  // Only about 70% of letters will have a flare to reduce clutter
  const [hasFlare] = useState(() => Math.random() > (0.3 / interval));

  return (
    <span className="relative inline-block">
      <span className="relative z-10" style={{ color: color, textShadow: `0 0 15px ${color}A0` }}>
        {char === ' ' ? '\u00A0' : char}
      </span>
      {char !== ' ' && hasFlare && (
        <motion.div
           initial={{ opacity: 0, scale: 0, rotate: 0 }}
           animate={{ 
             opacity: [0, 1, 1, 0],
             scale: [0, 1, 1, 0],
             rotate: [0, 180] // Rotate clockwise
           }}
           transition={{
             duration: duration,
             times: [0, 0.4, 0.6, 1],
             repeat: Infinity,
             repeatDelay: (3 * interval) + delay, // Much longer delay between appearances
             ease: "easeInOut"
           }}
           className="absolute z-20 pointer-events-none flex items-center justify-center mix-blend-screen"
           style={{
             top: `${yPos}%`,
             left: `${xPos}%`,
             width: `${size}em`,
             height: `${size}em`,
             x: '-50%',
             y: '-50%',
           }}
        >
          {/* Main long streak */}
          <div className="absolute w-[100%] h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent 15%, ${color} 45%, white 50%, ${color} 55%, transparent 85%)`, filter: 'blur(0.5px)' }} />
          
          {/* Faint long streak glow */}
          <div className="absolute w-[100%] h-[12px] rounded-full opacity-60" style={{ background: `linear-gradient(90deg, transparent 15%, ${color} 45%, white 50%, ${color} 55%, transparent 85%)`, filter: 'blur(4px)' }} />
          
          {/* Cross short streak to make rotation visible */}
          <div className="absolute h-[30%] w-[2px] rounded-full" style={{ background: `linear-gradient(180deg, transparent 15%, ${color} 45%, white 50%, ${color} 55%, transparent 85%)`, filter: 'blur(0.5px)' }} />
          
          {/* Large soft circle core */}
          <div className="absolute w-[20%] h-[20%] max-w-[24px] max-h-[24px] rounded-full opacity-90" style={{ background: color, filter: 'blur(6px)' }} />
          <div className="absolute w-[10%] h-[10%] max-w-[12px] max-h-[12px] rounded-full opacity-100" style={{ background: 'white', filter: 'blur(2px)' }} />
          
          {/* Bright center core (sharp) */}
          <div className="absolute w-[3px] h-[3px] bg-white rounded-full" style={{ filter: 'blur(0.5px)' }} />
        </motion.div>
      )}
    </span>
  );
};

export function formatTextWithAccent(text: string, primaryColor: string, options?: { flareInterval?: number }) {
  if (!text) return null;
  
  const parts = text.split(/`([^`]+)`/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Even indices are normal text, odd indices are the text inside backticks
        if (index % 2 === 1) {
          return (
            <span key={index} className="relative inline-block whitespace-nowrap">
              {part.split('').map((char, charIndex) => (
                <FlareLetter key={charIndex} char={char} color={primaryColor} interval={options?.flareInterval} />
              ))}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
